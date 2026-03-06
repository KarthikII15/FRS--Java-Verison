import { getRuleClassByType } from './src/core/rules/index.js';

const rulesToTest = [
    'AgeGenderClassify',
    'GenderDemographics',
    'AlprDetection',
    'HelmetWeapon',
    'BackdoorEntryViolation',
    'FallDown',
    'ATMSafeOrHoodOpen',
    'VaultPersonDwellTime',
    'TrainArrivalDeparture',
    'Pms',
    'OverCrowding',
    'SmartOccupancy',
    'CameraAngleChange',
    'CameraTemperOrCovered',
    'AnimalCounting',
    'Loitering',
    'LoiteringObject',
    'Cleanliness',
    'InsectPresence',
    'PetWithoutPerson',
    'TrainIntrusion',
    'VehicleZoneIntrusion',
    'PmsRuleEnableOnPi',
    'CameraTemper'
];

console.log('--- TESTING RULE INSTANTIATION ---');
let passed = 0;
let failed = 0;

for (const ruleStr of rulesToTest) {
    try {
        const RuleClass = getRuleClassByType(ruleStr);
        if (!RuleClass) {
            console.error(`❌ [FAIL] ${ruleStr} -> RuleClass could not be found via getRuleClassByType.`);
            failed++;
            continue;
        }

        // Attempt instantiation
        const instance = new RuleClass({
            id: 'test-rule',
            type: ruleStr,
            parameters: { alertDuration: 1000, minConfidence: 0.5 }
        });

        // Check if it has an evaluate function
        if (typeof instance.evaluate !== 'function') {
            console.error(`❌ [FAIL] ${ruleStr} -> Instance does not have an evaluate() function.`);
            failed++;
        } else {
            console.log(`✅ [PASS] ${ruleStr} instantiated successfully.`);
            passed++;
        }

    } catch (err) {
        console.error(`❌ [ERROR] ${ruleStr} -> ${err.message}`);
        failed++;
    }
}

console.log('----------------------------------');
console.log(`Results: ${passed} Passed | ${failed} Failed`);
if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
