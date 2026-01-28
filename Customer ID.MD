# Customer & Site Logic Documentation

This document details the logic, ID generation rules, and data handling workflows implemented in `src/pages/AddCustomers.jsx` and `src/services/addCustomerService.js`.

## 1. Customer ID Generation

The Customer ID is a composite key generated to uniquely identify a customer while providing human-readable context (Phone, City, Name).

**Source:** `src/services/addCustomerService.js` (Lines 26-29)

### Format
`CU/{PhoneLast4}/{CityCode}/{CustomerName}`

### Component Breakdown
1.  **Prefix**: `CU` (Static marker for Customer).
2.  **PhoneLast4**:
    *   Extracts the **last 4 digits** of the `primary_phone`.
    *   *Logic*: `formData.primary_phone.slice(-4)`
3.  **CityCode**:
    *   Derived from the **City** of the **Primary Site** (the first site in the list).
    *   **Rule**: If City is "Raipur" (case-insensitive) → `RPR`.
    *   **Rule**: Otherwise → First 3 characters of the City name (Uppercased).
    *   **Fallback**: Returns `XXX` if city is missing (handled by `getCityCode` helper).
4.  **CustomerName**:
    *   The full text of the `customer_name` field.

### Example
*   **Inputs**:
    *   Name: `Amit Kumar`
    *   Phone: `9876543210`
    *   City: `Raipur`
*   **Result**: `CU/3210/RPR/Amit Kumar`

---

## 2. Site Management & ID Logic

The system supports adding multiple sites for a single customer during creation.

### Site ID Calculation Flow
**Source:** `src/services/addCustomerService.js` (Lines 82-105)

When saving sites, the service performs the following steps for **each** site:

1.  **Determine Context**: Identifies the `user` (Sales Executive) creating the site and the `city`.
2.  **Fetch Existing Count**:
    *   Calls `orderService.getOrderCounts(userId, city)` to find how many sites this user has already created in this specific city.
3.  **Batch Increment Logic**:
    *   *Problem*: If a user adds 3 sites for "Raipur" in one go, the database count won't update until all are saved.
    *   *Solution*: The service maintains a local `createdCounts` object keyed by `${userId}_${city}`.
    *   **Formula**: `FinalSiteNumber = DB_Count + Local_Batch_Count`.
4.  **Generation**:
    *   The final parameters are passed to `idGenerator.generateSiteId(...)` to create the formatted string (e.g., `MMYY/City/User/Count`).

### Primary Site Rule
The **first site** in the `sites` array (`formData.sites[0]`) is designated as the **Primary Site**.
*   **Data Inheritence**: The address, city, state, and contact person from this primary site are **duplicated** onto the main `customers` table record.
*   *Purpose*: This ensures backward compatibility with parts of the application that expect a customer to have a single, direct address.

---

## 3. Application Logic & Validation `AddCustomers.jsx`

### GST & Form Reset
*   **Logic**: The application aggressively maintains data consistency based on the GST status.
*   **Trigger**: When switching "Is Customer GST Registered?" from **Yes** to **No**.
*   **Action**: The **entire form user state is reset** to `INITIAL_FORM_STATE`. This prevents accidental retention of corporate details (Firm Name, GSTIN) for a non-registered customer.

### Input Validation Rules
*   **Phone Numbers**:
    *   Restricted to **numeric input only**.
    *   Hard capped at **10 digits**.
*   **GST Number**:
    *   Auto-converted to **Uppercase**.
*   **Location Dependency**:
    *   Changing the **State** dropdown immediately **clears the City** selection to prevent invalid State/City combinations.

### UI Previews
*   **Customer ID Preview**: A live preview of the Customer ID is calculated in real-time within the UI (`useMemo` hook) so the user can see exactly what the ID will look like before saving.
