# Attendance Intelligence Platform - User Guide

_This guide helps end users navigate the Attendance Intelligence Platform. It covers login, dashboards, and common tasks for both Admin and HR roles. It assumes the platform is running in API mode with the backend available._

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Logging In](#logging-in)
3. [Dashboard Overview](#dashboard-overview)
   - [Admin Dashboard](#admin-dashboard)
   - [HR Dashboard](#hr-dashboard)
4. [Navigating the Interface](#navigating-the-interface)
   - [Sidebar & Mobile Nav](#sidebar--mobile-nav)
   - [Scope Selector](#scope-selector)
5. [Common Tasks](#common-tasks)
   - [Admin Tasks](#admin-tasks)
   - [HR Tasks](#hr-tasks)
6. [Permissions & Access](#permissions--access)
7. [Troubleshooting](#troubleshooting)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started
- Ensure the backend is running at `http://localhost:8080/api` and the frontend at `http://localhost:5173`.
- Open a browser and navigate to the frontend URL.
- For demo purposes, quick access buttons are available on the login screen.

## Logging In

1. Enter your email and password.
2. Click **Sign In to Dashboard**.
3. If credentials are incorrect you'll see an error message; retry or contact your administrator.
4. Use "Quick Access Prototypes" buttons to auto-fill credentials for sample users:
   - **Main Admin**: `admin@company.com` / `admin123`
   - **HR Manager**: `hr@company.com` / `hr123`
   - **HR Associate**: `associate@company.com` / `assoc123`
5. After successful login, you’ll be directed to the appropriate dashboard based on your role.

> _Remember:_ Keep the browser tab open to maintain your session. Tokens are stored in localStorage and automatically refreshed.

## Dashboard Overview

### Admin Dashboard
Admins see a multi-tab interface:
- **Overview**: System health metrics, device statuses, alerts.
- **Users**: Manage user accounts and roles.
- **Operations Console**: Register/configure devices and view facility details.
- **Live Office Intelligence**: Real-time presence monitoring.
- **Accuracy**: Device recognition accuracy logs.
- **Audit Logs**: View a history of user actions and system events.

Use the top tabs or sidebar to switch between sections.

### HR Dashboard
HR users access workforce analytics:
- **Overview**: Attendance summary (present, late, absent), average hours, overtime.
- **Analytics**: Visual charts for trends, comparisons, and patterns.
- **Employee Profiles**: Individual data and performance.
- **Reports**: Export attendance and analytics data.

Charts are interactive; hover for details and use filters to narrow the timeframe.

## Navigating the Interface

### Sidebar & Mobile Nav
- On desktop, the sidebar on the left shows navigation links and the logout button.
- Use the **Scope Selector** at the top of the sidebar to change organizational context (tenant, customer, site).
- On mobile, a collapsible menu contains the same items; tap the hamburger icon to open.
- User info and theme toggle are available in both sidebar and header.

### Scope Selector
Click the dropdown near the user avatar to choose the current tenant/customer/site/unit you’re working within. Changing the scope updates data and permissions throughout the app.

## Common Tasks

### Admin Tasks
1. **Add a User**:
   - Go to **Users** tab.
   - Click **New User**, fill in name, email, role, and assign scope/permissions.
   - Save to create account.
2. **Register a Device**:
   - Navigate to **Operations Console**.
   - Click **Add Device**, enter device details, and assign to a site/unit.
3. **Monitor System Health**:
   - Open **Overview** and review uptime, recognition accuracy, and alerts.
4. **Review Audit Logs**:
   - Select **Audit Logs**.
   - Use filters (date, user) to find events; you can export logs as needed.
5. **Manage Memberships**:
   - In **Users**, select a user and edit their memberships to adjust scopes and permissions.

### HR Tasks
1. **View Today's Attendance**:
   - Open **Overview** on the HR dashboard.
   - Check metrics like present, late, absent counts.
2. **Analyze Trends**:
   - Go to **Analytics**.
   - Choose date range and departments; charts will update accordingly.
3. **Export Reports**:
   - In **Analytics** or **Overview**, click **Export** and choose CSV or PDF.
4. **View Employee Details**:
   - Search for an employee by name or ID; click to view their profile and attendance history.

## Permissions & Access
- An item or button appears only if you have the required permission (e.g. `users.manage`).
- If you try to access a route without permission, you'll be redirected to the home dashboard with an error.
- Contact your administrator if you need additional permissions or scope changes.

## Troubleshooting
- **Cannot login**: Verify credentials; clear browser cache and retry.
- **Session expired**: Refresh the page; if that fails, log in again.
- **Missing navigation items**: You might not have permission; check with admin.
- **Data not updating after scope change**: Log out and log back in if issues persist.

## Tips & Best Practices
- Log out when finished, especially on shared devices.
- Use the theme toggle for eye comfort (light/dark mode).
- Frequently refresh reports to ensure you have the latest data.
- Request help from your system administrator for account or permission issues.

---

_This user guide is intended for internal teams and end users of the Attendance Intelligence Platform. For technical documentation, refer to the `AUTHENTICATION_AUTHORIZATION_GUIDE.md` file._
