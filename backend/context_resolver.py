import json
from pathlib import Path
from semantic_interpreter import SemanticInterpreter

def strategy_unique_match(text, interpretation, matches, matrix):
    full = matches["full_matches"]
    if len(full) >= 1:
        return ({
            "strategy": "resolved",
            "selected": full[0],#{"target": full[0]["target"]},
        }, matches)
    return (None, matches)


def strategy_specify_concern(text, interpretation, matches, matrix):
    cats = matches["category_only_matches"]
    if len(cats) >= 1 and cats[0]["available_concerns"]:
        return ({
            "strategy": "specify_concern",
            "selected": {"category": cats[0]["category"]},
            "options": cats[0]["available_concerns"],
        }, matches)
    return (None, matches)


def strategy_specify_category(text, interpretation, matches, matrix):
    cons = matches["concern_only_matches"]
    if len(cons) == 1 and cons[0]["available_categories"]:
        return ({
            "strategy": "specify_category",
            "selected" : {"concern": cons[0]["concern"]},
            "options" : cons[0]["available_categories"],
        },matches)
    return (None, matches)


def strategy_disambiguate_by_subcategory(text, interpretation, matches, matrix):
    concern_only = matches.get("concern_only_matches", [])
    concern_ids = {str(entry["concern"]["id"]) for entry in concern_only}

    options = []

    for entry in matches["category_only_matches"]:
        parent_cat = entry["category"]
        subcats = parent_cat.get("subcategories", [])

        if not subcats:
            continue  # keine Subkategorien → überspringen

        # If no concerns identified in the given text, use all subcategories as options
        if not concern_ids:
            options.extend({"category": sub, "concern": None, "target": None} for sub in subcats)
            continue

        # If concerns has been found, try to filter the possible ambiguous categories to offer only the one which has potential match with the concerns 
        for sub in subcats:
            sub_id = str(sub["id"])
            if sub_id in matrix:
                for concern_id in concern_ids:
                    if concern_id in matrix[sub_id]:
                        options.extend({"category": sub, "concern": None, "target": None})
                        break  # ein Treffer reicht

    if options:
        return ({
            "strategy": "disambiguate_category",
            "selected": {"category": parent_cat},
            "options": options
        }, matches)

    return (None, matches)


STRATEGIES = [
    strategy_unique_match,
    strategy_disambiguate_by_subcategory,
    strategy_specify_concern,
    strategy_specify_category
]


class ContextResolver:
    config = None
    def __init__(self, config):
        self.semantic_interpreter = SemanticInterpreter(config)
        self.config = config
        self.matrix = config["matrix"]

    def getCategoryById(self, id):
        for cat in self.config["categories"]:
            if cat.get("id") == id:
                return cat
            for subcat in cat.get("subcategories", []):
                if subcat.get("id") == id:
                    return subcat
        return None

    def getConcernById(self, id):
        for concern in self.config.get("concerns", []):
            if concern.get("id") == id:
                return concern
        return None
        
    def resolve(self, text: str):
        interpretation = self.semantic_interpreter.interpret(text)
        print (f"Interpretation Categories: {json.dumps(interpretation['categories'])} / Concerns: {json.dumps(interpretation['concerns'])}")
        raw_cats = interpretation['raw'].get('categories', [])
        raw_cons = interpretation['raw'].get('concerns', [])

        raw_cat_map = {str(c['id']): c for c in raw_cats}
        raw_con_map = {str(c['id']): c for c in raw_cons}
    
        full_matches = []
        category_only_matches = {}
        concern_only_matches = {}
    
        for cat_id, concerns in self.matrix.items():
            cat_obj = raw_cat_map.get(cat_id)
    
            for con_id, target in concerns.items():
                con_obj = raw_con_map.get(con_id)
    
                if cat_obj and con_obj:
                    full_matches.append({
                        "category": cat_obj,
                        "concern": con_obj,
                        "target": target
                    })
                elif cat_obj and not con_obj:
                    entry = category_only_matches.setdefault(cat_id, {
                        "category": cat_obj,
                        "available_concerns": []
                    })
                    entry["available_concerns"].append({
                        "concern": self.getConcernById(con_id),
                        "target": target
                    })
                elif con_obj and not cat_obj:
                    entry = concern_only_matches.setdefault(con_id, {
                        "concern": con_obj,
                        "available_categories": []
                    })
                    entry["available_categories"].append({
                        "category": self.getCategoryById(cat_id),
                        "target": target
                    })
    
        structured_matches = {
            "full_matches": full_matches,
            "category_only_matches": list(category_only_matches.values()),
            "concern_only_matches": list(concern_only_matches.values())
        }
    
        for strategy in STRATEGIES:
            result, matches = strategy(text, interpretation, structured_matches, self.matrix)
            if matches:
                structured_matches = matches
            if result:
                result['interpretation'] = interpretation
                return result

        return {"strategy": "no_resolution"}

    def resolve_with_conversation(self, text: str, conversation: list):
        # Step 1: Run standard resolution for the current input
        current_result = self.resolve(text)
    
        # Step 2: Check if there is a previous entry in the conversation
        if not conversation:
            print("NO CONVERSATION")
            return current_result
    
        previous_selection = conversation[-1].get("selected")
        if not previous_selection:
            return current_result
    
        # Step 3: Check if current result includes a selected element
        selected = current_result.get("selected")
        if not selected:
            return current_result
    
        # Step 4: Try to combine based on presence of category/concern in both selections
        if "concern" in previous_selection and "category" in selected:
            con = self.getConcernById(previous_selection["concern"]["id"])
            cat = selected["category"]
        elif "category" in previous_selection and "concern" in selected:
            cat = self.getCategoryById(previous_selection["category"]["id"])
            con = selected["concern"]
        else:
            return current_result  # no valid combination

        if "id" in cat and "id" in con:
            cat_id = str(cat["id"])
            con_id = str(con["id"])
            if cat_id in self.matrix and con_id in self.matrix[cat_id]:
                return {
                    "strategy": "resolved",
                    "selected": {
                        "category": cat,
                        "concern": con,
                        "target": self.matrix[cat_id][con_id]
                    }
                }
                    
        # Step 5: No valid combination found — return original result
        return current_result