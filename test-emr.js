import { calculateInsurance } from './client/src/utils/emr.js';

const test1 = { // Example 1: 5 diseases
  bmi: 31,
  family: 'both_below_65',
  diseases: { thyroid: 2, asthma: 1, hypertension: 1, diabetes: 1, gut_disorder: 1 },
  habits: {},
  occupation: 'desk_job',
  age: 21,
  lifeCover: 10000000,
  cirCover: 5000000,
  accidentCover: 5000000
};

const res1 = calculateInsurance(test1);
console.log('Test 1 EMR:', res1.emr); // Expect 80
console.log('Test 1 Class:', res1.lifeClass); // Expect III

const test2 = { // Example 2: thyroid only
  bmi: 31,
  family: 'both_below_65',
  diseases: { thyroid: 2 },
  habits: {},
  occupation: 'desk_job',
  age: 21,
  lifeCover: 10000000,
  cirCover: 5000000,
  accidentCover: 5000000
};

const res2 = calculateInsurance(test2);
console.log('Test 2 EMR:', res2.emr); // Expect 15
console.log('Test 2 Loading:', res2.lifeFactor); // Expect 1
console.log('Test 2 Total Premium:', res2.total); // Expect 43750
console.log('Test 2 Life:', res2.lifePremium); // 18750
console.log('Test 2 CIR:', res2.cirPremium); // 18750
console.log('Test 2 Acc:', res2.accPremium); // 6250
