export const plannerOutputShapeExample = {
  websiteClassification: {
    primaryType: "ecommerce",
    confidence: 0.82,
    reasoningSummary: "The page presents checkout, pricing, and newsletter signals."
  },
  importantJourneys: [
    {
      name: "Start checkout",
      description: "Visitor attempts to continue from product interest to checkout.",
      priority: "high",
      routes: ["/"]
    }
  ],
  proposedMissions: [
    {
      type: "interaction-tester",
      priority: 15,
      reason: "Checkout controls are visible and should be prioritized for safe interaction checks.",
      targetRoutes: ["/"],
      suggestedLimits: {
        maxInteractions: 5
      }
    }
  ],
  planningWarnings: [],
  limitations: ["Only the bounded planning snapshot was inspected."]
};
