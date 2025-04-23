# Marketing scripts

These are used in webflow to populate (build tables) pricing data

The only ones used are `pricing-tables.js` and `fees-dropdown.js`. The others are legacy, but I don't know webflow well enough to remove them.

If you update them, you need to make a new Release and tag in github (eg v9.9), then go into webflow, and:

* In DESIGN mode, find the *Fees* page and the *Clinic Template* page template (you need to do this to both)
* Hit the cog next to the name (opens the **Fees Settings** panel). Scroll to the bottom
* In the **Custom Code** section, find the **Inside \<head\> tag** section
* Change the version as needed

```html
<script src="https://cdn.jsdelivr.net/gh/tendnz/tend-marketing-scripts@v9.0/pricing-tables.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tendnz/tend-marketing-scripts@v9.0/fees-dropdown.js"></script>
```

* Once you have done this, you can publish both pages - to staging first, then live when needed.

## Pricing Tables

This is all done by looking for a DIV with a specific name, and appending stuff in there.

For Fee's (you can click around to find the right one) the heirachy is / was:

* our-fees-pricing-spacing
  * table-tooltop-header-wrapper
  * pricing-container <---- this one
  * some text

Edit the ID of that container to match the one in the script, and it will populate the table with the data from the JSON file.

```javascript
const enrolledContainer = document.getElementById('enrolledPricingContainer');
const cscContainer = document.getElementById('cscPricingContainer');
const casualContainer = document.getElementById('casualPricingContainer');
const casualCscContainer = document.getElementById('casualCscPricingContainer'); //<--- the container ID
const servicesContainer = document.getElementById('servicesPricingContainer');

if (enrolledContainer) {
  enrolledContainer.innerHTML = generateTable(enrolledCategories, ageMap, false, true);
} else {
  console.log("Enrolled pricing container not found.");
}

if (cscContainer) {
// CSC tables receive specific formatting
cscContainer.innerHTML = generateTable(cscCategories, ageMap, true);
} else {
  console.log("CSC pricing container not found.");
}

if (casualContainer) {
  casualContainer.innerHTML = generateTable(casualCategories, ageMap);
} else {
  console.log("Casual pricing container not found.");
}

if (casualCscContainer) {
  casualCscContainer.innerHTML = generateTable(casualCscCategories, ageMap);
} else {
  console.log("Casual CSC pricing container not found.");
}

if (servicesContainer) {
  servicesContainer.innerHTML = generateTable(servicesCategories, ageMap);
} else {
  console.log("Services pricing container not found.");
}


```
