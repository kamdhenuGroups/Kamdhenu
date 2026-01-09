# Kamdhenu CRM Project Documentation

## 1. Project Overview
**Kamdhenu CRM** is a comprehensive Customer Relationship Management system designed to streamline the sales and order management process for Kamdhenu Adhesives. It manages the entire lifecycle of sales operations, from lead generation and tracking to order processing, payment collection, and loyalty point allocation. The application allows sales representatives and administrators to efficiently manage contractors, sites, and orders while providing real-time analytics through a dynamic dashboard.

## 2. Technology Stack

### Frontend Architecture
- **Framework**: [React](https://react.dev/) (v18) - Component-based UI library.
- **Build Tool**: [Vite](https://vitejs.dev/) - Fast frontend tooling and build server.
- **Routing**: [React Router](https://reactrouter.com/) (v6) - Client-side routing for seamless navigation.
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand) - Lightweight and scalable state management.
- **Styling**:
    - [Tailwind CSS](https://tailwindcss.com/) (v4) - Utility-first CSS framework for rapid UI development.
    - [Material UI (MUI)](https://mui.com/) - Pre-built accessible components.
    - [Emotion](https://emotion.sh/) - CSS-in-JS library used by MUI.
    - `lucide-react` & `@fortawesome/react-fontawesome` - Icon sets.

### Backend & Infrastructure
- **Platform**: [Supabase](https://supabase.com/) - Open-source Firebase alternative.
- **Database**: PostgreSQL - Robust relational database.
- **Authentication**: Supabase Auth (built on top of GoTrue).
- **Storage**: Supabase Storage - Project file hosting (images, proofs).

### Key Libraries & Tools
- **Data Visualization**: `recharts` - Composable charting library for React.
- **Date Handling**: `date-fns` - Modern date utility library.
- **Excel Export**: `xlsx` - SheetJS for exporting data to spreadsheets.
- **PDF Generation**: `jspdf` & `jspdf-autotable` - Client-side PDF creation.
- **Notifications**: `react-hot-toast` - Elegant visual notifications.

## 3. Getting Started

### Prerequisites
- Node.js (Latest Long Term Support Version recommended)
- npm (Node Package Manager)

### Installation
1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd kamdhenu-adhesive
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```

### Environment Configuration
Create a `.env` file in the root directory. You must configure the following keys for the Supabase connection to work:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running the Application
*   **Development Server**: Starts the local dev server with hot module replacement.
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

*   **Production Build**: Compiles the application for deployment.
    ```bash
    npm run build
    ```

*   **Preview Build**: Locally preview the production build.
    ```bash
    npm run preview
    ```

## 4. Project Structure

```
kamdhenu-adhesive/
├── public/              # Static assets (favicons, manifests)
├── src/
│   ├── assets/          # Project-specific images and logos
│   ├── components/      # Reusable UI components (e.g., PaymentDetailsCard, TableFilterHeader)
│   ├── data/            # Static data sets (e.g., indianLocations.js)
│   ├── pages/           # Main application route components
│   │   ├── CRM.jsx          # Order listing and filtering interface
│   │   ├── Dashboard.jsx    # Analytics and reporting dashboard
│   │   ├── Leads.jsx        # Lead management pipeline
│   │   ├── Login.jsx        # User authentication
│   │   ├── MyProfile.jsx    # User details and settings
│   │   ├── NewOrder.jsx     # Complex order creation wizard
│   │   ├── OrderDetails.jsx # Read/Update view for specific orders
│   │   └── Settings.jsx     # App-wide configurations
│   ├── services/        # API integration layer
│   │   ├── dashboardService.js # Data aggregation for dashboard
│   │   ├── leadService.js      # CRUD operations for leads
│   │   ├── orderService.js     # Complex order management logic
│   │   └── paymentService.js   # Payment processing functions
│   ├── store/           # Zustand stores for global state
│   ├── App.jsx          # Root component handling routing and layout
│   ├── main.jsx         # Application entry point
│   ├── supabase.js      # Supabase client configuration
│   └── index.css        # Global styles and Tailwind directives
├── supabaseSCHEMA.sql   # SQL reference for database structure
├── package.json         # Project dependencies and scripts
└── vite.config.js       # Vite bundler configuration
```

## 5. Database Schema

The application relies on a structured PostgreSQL database hosted on Supabase.

### Core Tables

#### 1. `users`
Stores system users including sales representatives and admins.
- **`user_id`** (PK): Unique ID.
- **`username`**: Unique login identifier.
- **`password`**: Authenticated credential.
- **`role`**: User permission level (e.g., Admin, Sales).
- **`page_access`**: Array of strings defining which pages the user can access.
- **`full_name`, `email`, `phone_number`**: Profile details.

#### 2. `leads`
Tracks potential business opportunities.
- **`lead_id`** (PK): Unique identifier.
- **`customer_name`, `customer_phone`**: Contact info.
- **`lead_status`**: Current state (`New`, `Contacted`, `Qualified`, `Proposal Sent`, `Negotiation`, `Won`, `Lost`).
- **`state`, `city`**: Geographic location.
- **`lead_source_user_id`**: Reference to the user who created the lead.

#### 3. `orders`
The central table for sales transactions.
- **`order_id`** (PK): Unique generated ID.
- **`contractor_id`, `site_id`**: Link to specific contractor and site entities.
- **`contractor_name`, `customer_type`**: Client details (`Contractor`, `Dealer`, `Mistry`).
- **`total_amount`**: The financial value of the order.
- **`order_status`**: (`Pending`, `Approved`, `Rejected`, `New`).
- **`payment_status`, `payment_terms`**: Financial state tracking.
- **`delivery_address`, `logistics_mode`**: Fulfillment details.
- **`created_by_user_id`**: User responsible for the order.

#### 4. `products`
Line items associated with an order.
- **`product_id`** (PK): Unique ID.
- **`order_id`** (FK): Link to parent order.
- **`product_name`**: Name of the item.
- **`quantity`, `unit_price`**: Billing details.
- **`reward_points`**: Loyalty points associated with this product purchase.

#### 5. `payments`
Records of financial transactions against orders.
- **`payment_id`** (PK): Unique ID.
- **`order_id`** (FK): Link to the order.
- **`paid_amount`, `order_amount`**: Tracking partial or full payments.
- **`payment_mode`**: Method (`Cash`, `Online`, `Cheque`).
- **`payment_proof`**: URL to the uploaded proof image.
- **`due_date`**: Calculated date for expected payment.

#### 6. `points_allocation`
Manages the distribution of loyalty points to stakeholders.
- **`id`** (PK): Unique ID.
- **`order_id`** (FK): Link to the order generating the points.
- **`person_name`, `role`**: Beneficiary details.
- **`allocated_points`**: Integer value of points given.

## 6. Comprehensive Page Documentation

This section provides a detailed breakdown of every page within the `src/pages` directory, explaining its purpose, features, and underlying logic.

### 1. 📊 Dashboard (`src/pages/Dashboard.jsx`)
The command center of the application, providing high-level insights and performance metrics.

*   **Primary Purpose**: To give a snapshot of sales performance, payment collections, and order trends.
*   **Key Components**:
    *   **Live Order Tracking**: A line chart visualizing order volume hour-by-hour for the current day.
    *   **Monthly Distribution**: A pie chart showing the percentage of orders received in each month.
    *   **Sales Analytics**:
        *   **Total Orders**: Bar chart for monthly order counts.
        *   **Revenue Trend**: Area chart showing total revenue (deal value) trends over the year.
        *   **City Wise Sales**: Pie chart breaking down sales performance by city.
    *   **Financial Insights**:
        *   **Payment Collections**: A stacked bar chart contrasting 'Paid' vs 'Due' amounts per month.
        *   **Payment Modes**: A distribution chart for Cash, UPI, Cheque, etc.
*   **Interactivity**:
    *   **Year/Month Filtering**: Almost all charts respond to global or local year/month dropdown filters.
    *   **Dynamic Data**: Utilizes `dashboardService.js` to fetch and aggregate data on the fly.

### 2. 📝 CRM (`src/pages/CRM.jsx`)
The core operational interface for managing the order lifecycle.

*   **Primary Purpose**: To list, filter, search, and manage existing orders.
*   **Key Features**:
    *   **Advanced Data Table**:
        *   **Multi-Column Filtering**: Filter by Status, City, RM (Relationship Manager), and Customer Type using a custom dropdown header component (`TableFilterHeader`).
        *   **Date Range**: Filter orders within a specific start and end date.
        *   **Global Search**: Real-time search across Contractor Name, Order ID, and Site ID.
        *   **Sorting**: Sort by Date or Amount (Ascending/Descending).
    *   **Quick Stats Cards**: Four top cards showing Total Orders, Pending Approvals, Approved Count, and Total Generated Revenue.
    *   **Detailed Order Modal**: Clicking any row opens a full-screen modal with tabs for:
        *   **Order Info**: Customer details, Logistics, Remarks.
        *   **Products**: List of items, quantities, prices, and points.
        *   **Payments**: Payment history table and proof viewing.
        *   **Points**: Allocation breakdown for contractors/mistrys.
    *   **Actions**:
        *   **Approve/Reject**: Admins can change order status directly from the modal.
        *   **Print/Export**: Generate PDFs or Excel sheets (functionality hooks present).

### 3. 🛍️ New Order (`src/pages/NewOrder.jsx`)
A sophisticated multi-step wizard for generating valid sales orders.

*   **Primary Purpose**: To create new orders with strict validation and automated ID generation.
*   **Key Features**:
    *   **Smart ID Generation**:
        *   **Contractor ID**: Auto-generated based on City, Type (Contractor/Dealer), and Name.
        *   **Site ID**: Auto-generated based on User ID, City, Date, and a sequential daily count.
        *   **Order ID**: Composite key derived from Site ID + Order Number.
    *   **Customer Lookup**: Search functionality to find existing contractors and auto-fill their details (Phone, Address).
    *   **Product Manager**:
        *   Dynamic row addition/removal for products.
        *   Auto-calculation of Line Totals (Qty * Price) and Total Order Value.
        *   Auto-calculation of Total Reward Points based on product selection.
    *   **Points Allocation System**:
        *   Allows splitting total reward points between multiple beneficiaries (e.g., 60% to Contractor, 40% to Mistry).
        *   Validation ensures allocated points do not exceed the total earned.
    *   **Order History Tab**: A side-tab allows users to quickly view their own past orders without leaving the creation page.

### 4. 👥 Leads (`src/pages/Leads.jsx`)
A dedicated pipeline for managing potential business opportunities before they become orders.

*   **Primary Purpose**: To track prospective customers and their conversion status.
*   **Key Features**:
    *   **Kanban-style Statuses**: Leads move through stages: `New` -> `Contacted` -> `Qualified` -> `Proposal Sent` -> `Negotiation` -> `Won` -> `Lost`.
    *   **CRUD Operations**: Full capability to Create, Read, Update, and Delete leads.
    *   **Search & Filter**: Find leads by Name, Phone, or ID; Filter by current Status.
    *   **Location Awareness**: Captures State and City for every lead using `indianLocations.js` data.
    *   **Quotation Tracking**: Text area to log initial price quotes or conversation notes.

### 5. 💳 Order Details & Payments (`src/pages/OrderDetails.jsx`)
A focused view for the finance and fulfillment aspect of an order.

*   **Primary Purpose**: To manage the payment lifecycle of an approved order.
*   **Key Features**:
    *   **Payment Tracking**: Visual status indicators (`Paid`, `Partial`, `Pending`, `Overdue`).
    *   **Proof Management**:
        *   **Upload**: Upload payment screenshots/receipts directly to `payments-proof` Supabase storage bucket.
        *   **View**: Securely fetch and display proof images.
    *   **Due Date Logic**: Automatically calculates due dates based on 'Payment Terms' (e.g., 30 Days, 45 Days) set during order creation.
    *   **Overdue Calculation**: Displays the number of days a payment is overdue.
    *   **Balance Monitoring**: Real-time calculation of `Total Amount` vs `Paid Amount` vs `Balance Due`.

### 6. 👤 My Profile (`src/pages/MyProfile.jsx`)
The user's personal account management center.

*   **Primary Purpose**: To view and edit personal information and security settings.
*   **Key Features**:
    *   **Profile Picture**: View and upload profile images (stored in `images` bucket).
    *   **Personal Info**: Edit Full Name, Designation, Department, Gender, and DOB.
    *   **Contact Info**: Manage Email, Phone Number, and Current Address.
    *   **Security**: Update account password.
    *   **Read-Only Fields**: Certain fields like `User ID` and `Username` are locked to prevent system inconsistency.
    *   **Edit/Save Mode**: Toggle based UI to prevent accidental edits.

### 7. ⚙️ Settings (`src/pages/Settings.jsx`)
The administrative control panel for user and system management.

*   **Primary Purpose**: To manage system users, roles, and access permissions.
*   **Key Features**:
    *   **User Management**: List all system users with search and department filtering.
    *   **Role-Based Access Control (RBAC)**:
        *   Assign roles: `Admin`, `Sales Head`, `RM` (Relationship Manager), `CRM`.
        *   **Page Access**: Granularly toggle which pages a user can access (e.g., give a user access to 'Leads' but not 'Settings').
    *   **User Creation Module**:
        *   Validation for unique `User ID` and `Username`.
        *   One-click "Active/Inactive" toggle to soft-ban or reactivate users.
    *   **Responsive Layout**: Switches between a Data Table view on Desktop and a Card view on Mobile for better usability.

### 8. 🔐 Login (`src/pages/Login.jsx`)
The secure entry point to the application.

*   **Primary Purpose**: To authenticate users and establish a session.
*   **Key Features**:
    *   **Authentication**: Validates Username and Password against the `users` table in Supabase.
    *   **Active Check**: Automatically blocks login if the user's `is_active` flag is false.
    *   **Session Management**: Stores user details and admin status in `localStorage` and Zustand store (`authStore`).
    *   **UI/UX**: Clean, split-screen design with a branded illustration and password visibility toggle.

## 7. Scripts

-   `npm run dev`: Starts the Vite development server.
-   `npm run build`: Compiles the app for production.
-   `npm run lint`: Runs ESLint to check for code quality issues.
-   `npm run preview`: Locally previews the production build.
