document.addEventListener("DOMContentLoaded", async () => {

  // This is not used anymore

  const endpoints = {
    "Locations": "https://api.tend.nz/marketing/locations",
    "EnrolmentLocations": "https://api.tend.nz/marketing/enrolment-locations",
    "PriceList": "https://api.tend.nz/marketing/price-list"
  };

  const fetchData = async (url) => {
    try {
      const res = await axios.get(url, { headers: { 'Accept': 'application/json' } });
      console.log("Fetched data from", url, res.data); // Check the fetched data
      return res.data;
    } catch (e) {
      console.error("Error fetching from", url, e);
      return undefined; // Explicitly return undefined on error
    }
  };

  const extractDesc = item => {
    const desc = item.marketingDescription || item.description || "";
    return desc;
  };

  const [priceDataResponse, locDataResponse, enrolmentLocDataResponse] = await Promise.all([
    fetchData(endpoints.PriceList),
    fetchData(endpoints.Locations),
    fetchData(endpoints.EnrolmentLocations)
  ]);

  // Correctly accessing nested data
  const locData = locDataResponse.data;
  const enrolmentLocData = enrolmentLocDataResponse.data;
  const priceData = priceDataResponse.data;

  const locMap = enrolmentLocData.marketingEnrolmentLocations.reduce((acc, loc) => {
    acc[loc.id] = loc.name;
    return acc;
  }, {});


  const ageMap = {
    'Child4': '4 yrs',
    'ChildUnder14': 'Under 14 yrs',
    'Youth14to17': '14-17 yrs',
    'Youth16to18': '16-18 yrs',
    'Under18': 'Under 18 yrs',
    'Adult18to24': '18-24 yrs',
    'Adult18OrOver': '18+ yrs',
    'Adult25OrOver': '25+ yrs',
    'Adult25to64': '25-64 yrs',
    'Adult25to44': '25-44 yrs',
    'Adult45to64': '45-64 yrs',
    'Adult65OrOver': '65+ yrs',
    'NoRequirement': 'N/A'
  };

  const containers = {
   "Enrolled": "enrolled",
   "Enrolled (CSC)": "csc",
   "Casual": "casual"
  };

  const generateTable = (locId, items, tableName = '') => {
    const locName = locMap[locId] || "Online";

    const isAgeSpecific = tableName === "Enrolled" || tableName === "Enrolled (CSC)";

    const isCSC = tableName.includes("CSC");

    let availableGroups;

    if (isAgeSpecific) {
      const baseAgeGroups = ['ChildUnder14', 'Youth14to17', 'Adult18to24'];
      const allPossibleGroups = ['Adult25to64', 'Adult65OrOver', 'Adult25OrOver']; // Include all possible groups beyond base

      // Filter out the groups based on item age requirements present
      const relevantExtendedGroups = allPossibleGroups.filter(extGroup =>
        items.some(item => item.ageRequirement === extGroup));

      // Special handling for 'Adult25OrOver'
      const includesOver25 = relevantExtendedGroups.includes('Adult25to64') || relevantExtendedGroups.includes('Adult25OrOver');
      const finalGroups = includesOver25 ? relevantExtendedGroups.filter(group => group !== 'Adult65OrOver') : relevantExtendedGroups;

      availableGroups = baseAgeGroups.concat(finalGroups.length > 0 ? finalGroups : ['Adult25OrOver']);
    } else {
      availableGroups = ['AllAges'];
    }

    // Log the determined available groups for debugging
    console.log("Available age groups for table:", availableGroups);

    items.forEach(item => {
      console.log(`Processing item: ${item.name}, Age Requirement: ${item.ageRequirement}, Locations:`, item.enrolmentLocationIds);
    });

    const groupedItems = items.reduce((acc, item) => {
      const commonDesc = extractDesc(item);
      const duration = item.marketingDuration ? item.marketingDuration.toString() : "null";
      const key = `${commonDesc}:::${duration}`;

      // Check if the current item has a 'NoRequirement' age requirement.
      if (item.ageRequirement === 'NoRequirement' && isAgeSpecific && !tableName.includes("CSC")) {
        // For items with no specific age requirement, add them to each age group category,
        // but do not overwrite if a specific age item already exists for that age group.
        availableGroups.forEach(age => {
          if (!acc[key] || !acc[key][age]) { // Only add if not already set by a specific age item
            acc[key] = { ...(acc[key] || {}), [age]: item };
          }
        });
      } else {
        // For items with a specific age requirement, add/overwrite the item for that age group.
        acc[key] = { ...(acc[key] || {}), [item.ageRequirement]: item };
      }

      return acc;
    }, {});

    console.log(`Grouped items for location ${locId}:`, groupedItems);

  const widthAutoClass = !isAgeSpecific || isCSC ? 'width-auto' : '';

  let table = `<div class="flex-table ${widthAutoClass}">`;

  // Header
  table += `<div class="flex-row header">`;
  table += `<div class="flex-cell header-first heading-style-h6 text-color-purple">Service</div>`;
  table += `${availableGroups.map((age, index) => {
    let additionalClasses = index === 0 ? 'start' : '';
    additionalClasses += index === availableGroups.length - 1 ? ' rounded-top-right last' : '';
    
    // Determine display text based on the age group and table name
    let displayAge;
    if (age === 'AllAges') {
      displayAge = 'All Ages'; // Direct handling for non-age-specific tables
    } else if (tableName.includes("CSC") && age === 'NoRequirement') {
      displayAge = '18+ yrs'; // Special case for CSC table with "NoRequirement"
    } else {
      displayAge = ageMap[age]; // Standard case using ageMap
    }

    if (isCSC) {
      additionalClasses += ' csc-max-width';
    }

    return `<div class="flex-cell header-age heading-style-h6 text-color-purple ${additionalClasses}">${displayAge}</div>`;
  }).join('')}</div>`;

  const entries = Object.entries(groupedItems);
  table += `${entries.map(([key, group], rowIndex) => {
    const [description, duration] = key.split(':::');
    const durationText = duration !== 'null' ? ` (${duration} mins)` : '';

    const isLastRow = rowIndex === entries.length - 1;
    const isFirstRow = rowIndex === 0;
    const isOnlyRow = entries.length === 1;

    const rowClass = isOnlyRow ? 'end first' : (isLastRow ? 'end' : (isFirstRow ? 'first' : ''));

    const cells = availableGroups.map((age, ageIndex) => {
      const item = group[age] || (isAgeSpecific ? group['NoRequirement'] : Object.values(group)[0]);
      const price = item ? (item.amountInCents === 0 ? 'Free' : `$${item.amountInCents / 100}`) : 'N/A';

      let additionalClasses = '';
      if (isFirstRow) additionalClasses += ' first';
      if (ageIndex === 0) additionalClasses += ' start';
      if (ageIndex === availableGroups.length - 1) additionalClasses += ' last';
      if (isLastRow) additionalClasses += ' end';
      if (isOnlyRow && ageIndex === 0) additionalClasses += ' first';
      if (isLastRow && ageIndex === availableGroups.length - 1) additionalClasses += ' rounded-bottom-right';

      if (isCSC) {
        additionalClasses += ' csc-max-width'; // Adding .csc-max-width for CSC tables
      }

      return `<div class="flex-cell price text-size-regular ${additionalClasses}">${price}</div>`;
   }).join('');

    const firstCellClass = isFirstRow && !isLastRow ? 'start' : (isLastRow ? 'start rounded-bottom-left' : '');

    return `<div class="flex-row ${rowClass}"><div class="flex-cell first ${firstCellClass}">${description} <span class="text-size-regular text-color-grey">${durationText}</span></div>${cells}</div>`;
  }).join('')}</div>`;

  // Get the container for this table type
  let containerId = containers[tableName];
  if (containerId) {
    let containerElement = document.querySelector(`.clinics-pricing-wrapper .${containerId}`);
    if (containerElement) {
      containerElement.innerHTML = table;
    } else {
      console.warn(`Container with class ${containerId} not found.`);
    }
  } else {
   console.warn(`No container defined for table type: ${tableName}`);
  }
  };

const categorizePriceList = (priceListData) => {
  const enrolled = [];
  const enrolledCsc = [];
  const casual = [];
  const enrolledFallbackMap = {}; // This holds the non-CSC items as fallbacks for CSC items
  const noReqFallbackMap = {}; // This holds the NoRequirement items as fallbacks for all age-specific items

  // First pass to categorize items and build fallback maps
  priceListData.forEach(item => {
    const descKey = item.marketingDescription + (item.marketingDuration || '');

    // Build fallback map for enrolled non-CSC items for every age, including NoRequirement
    if (!item.requiresCommunityServicesCard && item.membershipRequirement === "ENROLLED") {
      enrolledFallbackMap[descKey + item.ageRequirement] = item;

      // Separately build NoRequirement fallback map
      if (item.ageRequirement === 'NoRequirement') {
        noReqFallbackMap[descKey] = item;
      }
    }

    // Categorize into enrolled, CSC, and casual
    if (item.membershipRequirement === "ENROLLED" && !item.requiresCommunityServicesCard) {
      enrolled.push(item);
    } else if (item.membershipRequirement === "ENROLLED" && item.requiresCommunityServicesCard) {
      enrolledCsc.push(item);
    } else if (item.membershipRequirement === "CASUAL") {
      casual.push(item);
    }
  });

  // Fallback logic for CSC table and enrolled repeat prescriptions
  const finalEnrolledCsc = enrolledCsc.map(item => {
    const descKey = item.marketingDescription + (item.marketingDuration || '');
    const ageKey = item.ageRequirement || 'NoRequirement';

    // If CSC item with specific age is not found, fallback to non-CSC item with same age
    if (item.requiresCommunityServicesCard && !enrolledFallbackMap[descKey + ageKey]) {
      return enrolledFallbackMap[descKey + 'NoRequirement'] || item;
    }
    return item;
  });

  // Ensure repeat prescription items have no N/A values
  const finalEnrolled = enrolled.map(item => {
    if (item.itemCategory === "RepeatPrescription" && item.ageRequirement === 'N/A') {
      const descKey = item.marketingDescription + (item.marketingDuration || '');
      return noReqFallbackMap[descKey] || item;
    }
    return item;
  });

  return { enrolled: finalEnrolled, enrolledCsc: finalEnrolledCsc, casual };
};

  const locationGroupedPriceData = priceData.marketingPriceList
  .reduce((acc, item) => {
    item.enrolmentLocationIds.forEach(locId => {
      if (!acc[locId]) acc[locId] = [];
      acc[locId].push(item);
   });
    return acc;
  }, {});

  const desiredLocationData = { [desiredLocationId]: locationGroupedPriceData[desiredLocationId] };
  if (!desiredLocationData[desiredLocationId]) {
    console.warn(`No data found for location ID: ${desiredLocationId}`);
    return;
  }

  Object.entries(desiredLocationData).forEach(([locId, items]) => {
    const categorizedData = categorizePriceList(items);

    if (categorizedData.enrolled.length) generateTable(locId, categorizedData.enrolled, "Enrolled");
    if (categorizedData.enrolledCsc.length) generateTable(locId, categorizedData.enrolledCsc, "Enrolled (CSC)");
    if (categorizedData.casual.length) generateTable(locId, categorizedData.casual, "Casual");
  });
});
