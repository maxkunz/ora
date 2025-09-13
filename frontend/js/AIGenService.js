export class AIGenService {
  constructor({ endpointUrl, authToken }) {
    this.endpointUrl = endpointUrl;
    this.authToken = authToken;
  }

  async _post(body) {
    console.log("AIGenService URL:", JSON.stringify(this.endpointUrl));
    console.log("AIGenService Token:", JSON.stringify(this.authToken));
    console.log("AIGenService BOdy:", JSON.stringify(body));
    
    const res = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + this.authToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    console.log("AIGenService Body:", JSON.stringify(res));

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Lambda error: ${res.status} ${error}`);
    }

    return res.json();
  }

  async generateKeywords(businessContext, userInstruction, parentElement, existingElements = [], quantity = 10) {
    return this._post({
      action: "generate_keywords",
      business_domain: businessContext,
      user_instruction: userInstruction,
      parent_element: parentElement,
      existing_elements: existingElements,
      quantity
    });
  }

  async generatePhrases(businessContext, userInstruction, parentElement, existingElements = [], quantity = 10) {
    return this._post({
      action: "generate_phrases",
      business_domain: businessContext,
      user_instruction: userInstruction,
      parent_element: parentElement,
      existing_elements: existingElements,
      quantity
    });
  }

  async generateConcerns(businessContext, userInstruction, existingElements = [], categories = [], quantity = 10) {
    return this._post({
      action: "generate_concerns",
      business_domain: businessContext,
      user_instruction: userInstruction,
      existing_elements: existingElements,
      categories,
      quantity
    });
  }

  async generateCategories(businessContext, userInstruction, existingElements = [], quantity = 10) {
    return this._post({
      action: "generate_categories",
      business_domain: businessContext,
      user_instruction: userInstruction,
      parent_element: "",
      existing_elements: existingElements,
      quantity
    });
  }

  async generateSubcategories(businessContext, userInstruction, parentElement, existingElements = [], quantity = 10) {
    return this._post({
      action: "generate_subCategories",
      business_domain: businessContext,
      user_instruction: userInstruction,
      parent_element: parentElement,
      existing_elements: existingElements,
      quantity
    });
  }
}