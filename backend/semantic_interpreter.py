import json
import jellyfish
from pathlib import Path

class SemanticInterpreter:

    def __init__(self, config):
        # Check if config is a string (file path), if so, load from file
        if isinstance(config, str):
            with open(config, 'r') as file:
                self.config = json.load(file)
        elif isinstance(config, dict):
            self.config = config
        else:
            raise ValueError("Invalid configuration input. Must be either a file path or a JSON object.")

        # Load categories and concerns
        self.categories = {cat['id']: cat for cat in self.config.get('categories', [])}
        self.concerns = {con['id']: con for con in self.config.get('concerns', [])}
        self.targets = self.config.get('targets', {})  # currently unused

    def generate_ngrams(self, tokens, n):
        return [' '.join(tokens[i:i+n]) for i in range(len(tokens)-n+1)]

    def tokenize_and_augment(self, sentence):
        tokens = sentence.lower().split()
        bigrams = self.generate_ngrams(tokens, 2)
        trigrams = self.generate_ngrams(tokens, 3)
        return tokens + bigrams + trigrams

    def match_categories_and_concerns(self, tokens, threshold=0.9):
        matched_categories = {}
        matched_concerns = {}

        min_token_length = 3

        filtered_tokens = [t for t in tokens if len(t) >= min_token_length]

        for cat_id, category in self.categories.items():
            category_matched = False
        
            # Check subcategories first
            for subcat in category.get('subcategories', []):
                subcat_id = subcat.get('id')  # assuming subcategories have unique IDs
                
                keywords = list(subcat.get('keywords', []))
                keywords.append(subcat['name'])
                for keyword in keywords:
                    #print (f"Cat: {category['name']}, sub: {subcat['name']}, keyword: {keyword}")
                    for token in filtered_tokens:
                        similarity = jellyfish.jaro_winkler_similarity(keyword.lower(), token)
                        if similarity >= threshold:
                            if subcat_id not in matched_categories or similarity > matched_categories[subcat_id]['confidence']:
                                matched_categories[subcat_id] = {
                                    **subcat,
                                    'confidence': similarity
                                }
                                category_matched = True  # prevent parent match
                            break  # optional: break to avoid duplicate matches for subcategory
        
            if category_matched:
                continue  # skip parent category if a subcategory matched
            
            keywords = list(category.get('keywords', []))
            keywords.append(category['name'])
            # Check parent category only if no subcategory matched
            for keyword in keywords:
                for token in filtered_tokens:
                    similarity = jellyfish.jaro_winkler_similarity(keyword.lower(), token)
                    #print (f"Cat: {category['name']}, keyword: {keyword} vs token: {token} similarity: {similarity}")
                    if similarity >= threshold:
                        if cat_id not in matched_categories or similarity > matched_categories[cat_id]['confidence']:
                            matched_categories[cat_id] = {
                                **category,
                                'confidence': similarity
                            }
                        break  # optional: avoid unnecessary matches per keyword

        for con_id, concern in self.concerns.items():
            
            keywords = list(concern.get('keywords', []))
            keywords.append(concern['name'])
            for keyword in keywords:
                for token in filtered_tokens:
                    similarity = jellyfish.jaro_winkler_similarity(keyword.lower(), token)
                    if similarity >= threshold:
                        if con_id not in matched_concerns or similarity > matched_concerns[con_id]['confidence']:
                            matched_concerns[con_id] = {
                                **concern,
                                'confidence': similarity
                            }
                        break  # optional: abbrechen, wenn ein passender Token gefunden wurde

        return list(matched_categories.values()), list(matched_concerns.values())

    def interpret(self, sentence: str, parameters: dict = None, threshold: float = 0.95):
        tokens = self.tokenize_and_augment(sentence) 
        matched_categories, matched_concerns = self.match_categories_and_concerns(tokens, threshold = threshold) #currently default threshold of 0.9 is used in match functions so its filteres twice, all between 0.9 and 0,95 are only returned in raw_output
    
        # Filtere nach Konfidenz, extrahiere nur Namen
        categories_labels = [entry["name"] for entry in matched_categories]
        concerns_labels = [entry["name"] for entry in matched_concerns]
    
        return {
            "categories": categories_labels,
            "concerns": concerns_labels,
            "keyphrases": [],
            "classificationType": "nlu",
            "raw": {
                "categories": matched_categories,
                "concerns": matched_concerns
            }
        }