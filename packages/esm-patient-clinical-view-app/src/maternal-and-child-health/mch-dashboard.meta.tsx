export const antenatalDashboardMeta = {
  slot: 'patient-chart-antenatal-dashboard-slot',
  columns: 1,
  title: 'Antenatal Care',
  path: 'antenatal-care-dashboard',
  moduleName: '@thrustdevs/esm-patient-clinical-view-app',
  config: {},
  icon: '',
};

export const postnatalDashboardMeta = {
  slot: 'patient-chart-postnatal-dashboard-slot',
  columns: 1,
  title: 'Postnatal Care',
  path: 'postnatal-care-dashboard',
  moduleName: '@thrustdevs/esm-patient-clinical-view-app',
  config: {},
  icon: '',
};

export const labourAndDeliveryDashboardMeta = {
  slot: 'patient-chart-labour-and-delivery-dashboard-slot',
  columns: 1,
  title: 'Labour & Delivery',
  path: 'labour-and-delivery-dashboard',
  moduleName: '@thrustdevs/esm-patient-clinical-view-app',
  config: {},
  icon: '',
};

export const maternalAndChildHealthNavGroup = {
  title: 'Maternal & Child Health',
  slotName: 'maternal-and-child-health-slot',
  isExpanded: false,
  showWhenExpression:
    'patient.gender === "female" && (enrollment.includes("MCH - Child Services") || enrollment.includes("MCH - Mother Services"))',
};
