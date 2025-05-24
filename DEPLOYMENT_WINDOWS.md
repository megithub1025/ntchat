# NTChat Deployment Guide (Windows Server)

This guide provides instructions for deploying the NTChat application backend and frontend to a Windows Server environment.

**IMPORTANT NOTE ON TESTING:** Due to unresolved technical issues in the development/testing environment (specifically around Node.js module resolution for certain packages like `supertest` with Jest, and `vite` with Vitest), comprehensive automated integration testing for the backend APIs and all automated testing for the frontend UI could not be completed. While backend unit tests for core models and middleware are largely passing, this limitation means that the application has not been as thoroughly tested as desired. **Proceed with caution and ensure thorough manual testing post-deployment.**

## I. Prerequisites

*   **Windows Server**: Windows Server 2016 or later recommended.
*   **Node.js**: LTS version (e.g., v18.x or v20.x). Download from [https://nodejs.org/](https://nodejs.org/). Ensure Node.js and npm are added to the system PATH.
*   **PostgreSQL**: Version 12.x or later. Download from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).
*   **Git**: Latest version. Download from [https://git-scm.com/](https://git-scm.com/).
*   **PM2**: A process manager for Node.js. Install globally via npm after Node.js is installed:
    ```bash
    npm install -g pm2
    ```
*   **Web Server (for Frontend)**: IIS (Internet Information Services) is recommended as it's built into Windows Server. Other options like Nginx or Apache can also be used. This guide will focus on IIS. Ensure the URL Rewrite module is installed for IIS if using it for SPA hosting.

## II. Backend Deployment

The backend is a Node.js application located in the `ntchat/backend/` directory of the project.

### 1. Database Setup (PostgreSQL)

*   **Installation**:
    *   Follow the official PostgreSQL instructions to install it on your Windows Server.
    *   During installation, you will set a password for the default `postgres` superuser. Remember this password.
*   **Create Database User & Database**:
    *   Open `psql` (usually found in `C:\Program Files\PostgreSQL\<version>\bin\psql.exe`) or use pgAdmin.
    *   Connect as the `postgres` superuser.
    *   Create a dedicated user for NTChat (replace `'your_secure_password'` with a strong password):
        ```sql
        CREATE USER ntchat_user WITH PASSWORD 'your_secure_password';
        ```
    *   Create the database for NTChat, owned by the new user:
        ```sql
        CREATE DATABASE ntchat_db OWNER ntchat_user;
        ```
*   **Initialize Schema**:
    *   Clone the NTChat repository to your server if you haven't already:
        ```bash
        git clone <repository_url> ntchat 
        # Replace <repository_url> with the actual URL of your Git repository
        cd ntchat
        ```
    *   Navigate to the `ntchat/database/` directory.
    *   Execute the `init.sql` script against the `ntchat_db` using the `ntchat_user`. From the command prompt or PowerShell:
        ```bash
        psql -U ntchat_user -d ntchat_db -h localhost -f init.sql
        ```
        You will be prompted for `ntchat_user`'s password.

### 2. Application Setup

*   **Copy Backend Files**:
    *   Ensure the `ntchat/backend/` directory from the cloned repository is on your server (e.g., `C:\NTChat\backend`).
*   **Install Dependencies**:
    *   Open a command prompt or PowerShell, navigate to the backend directory:
        ```bash
        cd C:\NTChat\backend
        npm install --production
        ```
        The `--production` flag skips development dependencies.
*   **Configure Environment Variables (`.env` file)**:
    *   In the `ntchat/backend/` directory, create a file named `.env`.
    *   Add the following content, adjusting values as necessary:
        ```env
        # Server Configuration
        PORT=3000

        # Database Configuration (ensure these match your PostgreSQL setup)
        DB_HOST=localhost
        DB_PORT=5432
        DB_USER=ntchat_user
        DB_PASSWORD=your_secure_password # The password you set for ntchat_user
        DB_NAME=ntchat_db

        # JWT Configuration
        JWT_SECRET=your_very_strong_and_long_jwt_secret_key_at_least_32_chars # Replace with a strong, random string

        # LiEMS API Configuration (Placeholder - Update if/when LiEMS integration is live)
        LIEMS_API_BASE_URL=http://your-liems-api-ip-and-port 
        # Example: LIEMS_API_BASE_URL=http://192.168.1.200:8080 
        ```
    *   **Security Note**: Ensure `JWT_SECRET` is a long, random, and cryptographically strong string (at least 32 characters is a good starting point). Do not use default or weak secrets.

### 3. Running with PM2

PM2 will manage the backend Node.js process, ensuring it restarts on crashes and can run in the background.

*   **Start Application**:
    *   From the `C:\NTChat\backend` directory, start the application using PM2:
        ```bash
        pm2 start server.js --name "ntchat-backend"
        ```
*   **Check Status**:
    ```bash
    pm2 list
    pm2 logs ntchat-backend
    ```
*   **Save PM2 Process List (to restart on server reboot)**:
    ```bash
    pm2 save
    pm2 startup
    ```
    PM2 will provide a command to run to enable startup on boot. Execute that command (it usually involves running a command with administrator privileges).

### 4. Firewall Configuration

*   Ensure that the port the backend is running on (e.g., `3000` as per `.env`) is open in the Windows Firewall for inbound connections, especially if the frontend or users will access it from other machines.
    *   You can create an inbound rule using "Windows Defender Firewall with Advanced Security".
    *   Rule Type: Port
    *   Protocol: TCP
    *   Specific local ports: `3000` (or your configured port)
    *   Action: Allow the connection
    *   Profile: Choose appropriate profiles (Domain, Private, Public) based on your network setup and security policies.
    *   Name: "NTChat Backend Port" (or similar descriptive name)

## III. Frontend Deployment

The frontend is a React application built with Vite, located in `ntchat/frontend/`.

### 1. Build Frontend Application

*   **Install Dependencies (if not already done for build purposes)**:
    *   Open a command prompt or PowerShell, navigate to the frontend directory:
        ```bash
        cd C:\NTChat\frontend
        npm install 
        ```
*   **Update API Configuration for Frontend**:
    *   Before building, ensure the API and Socket URLs in the frontend service files are correct for your deployment environment.
    *   Edit `ntchat/frontend/src/services/authService.js` (and `chatService.js` if `API_BASE_URL` is defined there separately):
        ```javascript
        // Example: const API_BASE_URL = 'http://your_server_ip_or_domain:3000/api';
        const API_BASE_URL = 'http://localhost:3000/api'; // Replace with your actual backend URL if different
        ```
    *   Edit `ntchat/frontend/src/services/socketService.js`:
        ```javascript
        // Example: const SOCKET_URL = 'http://your_server_ip_or_domain:3000';
        const SOCKET_URL = 'http://localhost:3000'; // Replace with your actual backend URL if different
        ```
    *   Replace `localhost` with your server's actual IP address or domain name if the frontend will be accessed from other machines or if it's served on a different domain/port than the backend.
*   **Run Build Script**:
    *   The `package.json` scripts use `npx vite build`.
        ```bash
        npm run build
        ```
    *   This will create a `dist/` folder in `ntchat/frontend/` containing the static assets (HTML, CSS, JS).
    *   *(Note: As mentioned in the testing disclaimer, if `npm run build` fails with module resolution errors for `vite` itself, this indicates a Node.js/Vite setup issue on the build machine that needs to be resolved. The development environment encountered such issues.)*

### 2. Serve Frontend with IIS

*   **Install IIS**:
    *   If not already installed, add the "Web Server (IIS)" role via Server Manager. Ensure "Static Content" is enabled under "Common HTTP Features" (usually enabled by default with the Web Server role).
*   **Install URL Rewrite Module**:
    *   This module is crucial for Single Page Applications (SPAs) like React.
    *   Download and install it from the official IIS website: [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite).
*   **Create a New Website in IIS**:
    *   Open Internet Information Services (IIS) Manager.
    *   Right-click on "Sites" in the Connections pane and select "Add Website..."
    *   **Site name**: `NTChatFrontend` (or your preference)
    *   **Physical path**: Point this to the `ntchat/frontend/dist/` directory (e.g., `C:\NTChat\frontend\dist`).
    *   **Binding**:
        *   Type: `http`
        *   IP address: "All Unassigned" or a specific IP if needed.
        *   Port: `80` (or another port like `8080` if port 80 is in use by another application).
    *   **Host name**: (Optional) If you have a domain/subdomain configured in DNS for this site, enter it here (e.g., `ntchat.yourdomain.com`).
    *   Click "OK".
*   **Configure URL Rewrite for SPA**:
    *   Select your newly created website (`NTChatFrontend`) in IIS Manager.
    *   Double-click "URL Rewrite" in the features view (center pane).
    *   Click "Add Rule(s)..." in the Actions pane (right pane).
    *   Select "Blank rule" under "Inbound rules" and click "OK".
    *   Configure the rule:
        *   **Name**: `ReactSPARedirect` (or similar)
        *   **Match URL**:
            *   Requested URL: `Matches the Pattern`
            *   Using: `Regular Expressions`
            *   Pattern: `(.*)`
        *   **Conditions**:
            *   Logical grouping: `Match All`
            *   Click "Add..." to add the first condition:
                *   Condition input: `{REQUEST_FILENAME}`
                *   Check if input string: `Is Not a File`
            *   Click "Add..." again for the second condition:
                *   Condition input: `{REQUEST_FILENAME}`
                *   Check if input string: `Is Not a Directory`
        *   **Action**:
            *   Action type: `Rewrite`
            *   Rewrite URL: `/index.html`
        *   Make sure "Stop processing of subsequent rules" is checked (usually default).
        *   Click "Apply" in the Actions pane.

## IV. Initial Admin User

The backend `server.js` script is designed to create default users if they don't exist in the database upon its first successful startup and connection to the database:
*   **Admin User**:
    *   Username: `admin`
    *   Password: `adminpassword`
*   **Test User**:
    *   Username: `testuser`
    *   Password: `testpassword`

**Action Required**: It is **highly recommended** to log in with the default `admin` user immediately after deployment and change the password through user management features (if available) or directly in the database with a properly hashed password. You should also consider removing or changing the password for the default `testuser` for security reasons.

## V. LiEMS Integration Status

The integration with the LiEMS (Law Enforcement Integrated Management System) is **currently not implemented**.
*   Placeholder service functions exist in `ntchat/backend/services/liemsService.js`.
*   The `LIEMS_API_BASE_URL` in the backend's `.env` file is a placeholder and needs to be configured with the actual LiEMS API endpoint if this integration proceeds.
*   Authentication details (e.g., SignSDK usage) for LiEMS API calls are pending clarification and have not been integrated into the application.
*   Consequently, no data is currently synchronized with LiEMS.

## VI. Final Checks and Troubleshooting

*   Ensure both the PM2 process for `ntchat-backend` and your IIS website for the frontend are running.
*   Test application access from a client machine using the configured frontend URL.
*   **Backend Logs**: Check backend logs via `pm2 logs ntchat-backend` for any startup errors or runtime issues.
*   **Frontend Logs**: Use browser developer tools (Console and Network tabs) to check for any frontend errors or failed API requests.
*   **IIS Logs**: Located typically in `C:\inetpub\logs\LogFiles\W3SVC<SiteID>\`.
*   **Firewall**: Double-check Windows Firewall rules if you experience connectivity issues to the backend port or frontend port from other machines.
*   **Database Connection**: Verify the backend can connect to the PostgreSQL database. Check connection strings and user credentials in the `.env` file.
*   **Manual Testing**: Due to the previously mentioned limitations in automated testing, perform thorough manual testing of all application features:
    *   User registration and login.
    *   Chat room creation, joining, and listing.
    *   Sending and receiving messages in real-time.
    *   Viewing organization structure (users and departments).
    *   Role-based access control for administrative functions.

This concludes the deployment guide for NTChat on a Windows Server.
