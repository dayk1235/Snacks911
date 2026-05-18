import { resolveAction } from '../core/actionResolver';
import { UnifiedIntent } from '../core/intentDetector';

const testCases: { name: string; intent: UnifiedIntent }[] = [
  {
    name: "Strong Order",
    intent: {
      intent: "order",
      primaryIntent: "order",
      confidence: 0.95,
      source: "rule",
      entities: {
        product: { value: "Alitas 6 piezas", confidence: 0.95 }
      }
    }
  },
  {
    name: "Weak Order (Needs confirmation)",
    intent: {
      intent: "order",
      primaryIntent: "order",
      confidence: 0.65,
      source: "rule",
      entities: {
        product: { value: "Papas", confidence: 0.8 }
      }
    }
  },
  {
    name: "Multi-intent (Order + Browse)",
    intent: {
      intent: "browse_menu",
      primaryIntent: "order",
      intents: ["browse_menu", "order"],
      confidence: 0.92,
      source: "rule",
      entities: {
        product: { value: "Boneless", confidence: 0.92 }
      }
    }
  },
  {
    name: "Negation (Reject item)",
    intent: {
      intent: "reject_item",
      primaryIntent: "reject_item",
      confidence: 0.9,
      source: "rule",
      entities: {
        product: { value: "Alitas", confidence: 0.95 }
      }
    }
  },
  {
    name: "Unknown (Needs clarification)",
    intent: {
      intent: "unknown",
      primaryIntent: "unknown",
      confidence: 0.3,
      source: "rule"
    }
  }
];

function runTests() {
  console.log("=== ACTION RESOLVER VALIDATION ===\n");

  testCases.forEach(tc => {
    const decision = resolveAction(tc.intent);
    console.log(`TEST: ${tc.name}`);
    console.log(`INPUT INTENT: ${tc.intent.primaryIntent} (conf: ${tc.intent.confidence})`);
    console.log(`DECISION ACTION: ${decision.action}`);
    console.log(`REQUIRES CONFIRMATION: ${decision.requiresConfirmation}`);
    if (decision.reason) console.log(`REASON: ${decision.reason}`);
    console.log(`SAFE TO EXECUTE: ${decision.safeToExecute}`);
    if (decision.secondaryActions?.length) {
      console.log(`SECONDARY ACTIONS: ${JSON.stringify(decision.secondaryActions)}`);
    }
    console.log("-----------------------------------\n");
  });

  console.log("=== VALIDATION COMPLETE ===");
}

runTests();
