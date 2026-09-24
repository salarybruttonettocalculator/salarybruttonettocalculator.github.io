// Values reviewed against provider publications on 2026-09-23.
// A scheduled review updates this file and republishes after checking primary sources.
window.SALARY_RULES = Object.freeze({
  taxYear: 2026,
  reviewedAt: '2026-09-23',
  banksReviewedAt: '2026-09-23',
  germany: Object.freeze({
    brackets: Object.freeze({basic:12348, second:17799, third:69878, fourth:277825}),
    pensionCeiling:101400, healthCeiling:69750,
    employeePension:.093, employeeUnemployment:.013, employeeHealth:.073,
    averageAdditionalHealth:2.9, careChildless:.024, careParent:.018,
    saxonyCareDifference:.005, careChildDiscount:.0025,
    employeeAllowance:1230, singleParentAllowance:4260,
    solidarityThreshold:20350, solidarityJointThreshold:40700
  }),
  italy: Object.freeze({
    firstBracket:28000, secondBracket:50000,
    firstRate:.23, secondRate:.33, thirdRate:.43,
    extraInpsThreshold:56224, extraInpsRate:.01
  })
});
