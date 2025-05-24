import React, { useState, useEffect, useCallback } from 'react';
import chatService from '../services/chatService'; // Assuming functions are in chatService
import UserList from '../components/UserList/UserList';
import DepartmentList from '../components/DepartmentList/DepartmentList';

const organizationPageStyle = {
    display: 'flex',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    gap: '20px', // Space between main sections
};

const sectionStyle = {
    flex: 1, // Each section takes equal width initially
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '5px',
    backgroundColor: '#f9f9f9',
};

const departmentDetailStyle = {
    marginTop: '20px',
};

function OrganizationPage() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
    const [departmentUsers, setDepartmentUsers] = useState([]);

    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
    const [isLoadingDepartmentUsers, setIsLoadingDepartmentUsers] = useState(false);

    const [usersError, setUsersError] = useState('');
    const [departmentsError, setDepartmentsError] = useState('');
    const [departmentUsersError, setDepartmentUsersError] = useState('');

    // Fetch all users
    useEffect(() => {
        const fetchAllUsers = async () => {
            setIsLoadingUsers(true);
            setUsersError('');
            try {
                const fetchedUsers = await chatService.getUsers();
                setUsers(fetchedUsers || []);
            } catch (err) {
                console.error('Failed to fetch all users:', err);
                setUsersError(err.message || 'Failed to load users.');
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchAllUsers();
    }, []);

    // Fetch all departments
    useEffect(() => {
        const fetchAllDepartments = async () => {
            setIsLoadingDepartments(true);
            setDepartmentsError('');
            try {
                const fetchedDepartments = await chatService.getDepartments();
                setDepartments(fetchedDepartments || []);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
                setDepartmentsError(err.message || 'Failed to load departments.');
            } finally {
                setIsLoadingDepartments(false);
            }
        };
        fetchAllDepartments();
    }, []);

    // Fetch users for the selected department
    useEffect(() => {
        if (!selectedDepartmentId) {
            setDepartmentUsers([]); // Clear department users if no department is selected
            return;
        }

        const fetchDeptUsers = async () => {
            setIsLoadingDepartmentUsers(true);
            setDepartmentUsersError('');
            try {
                const fetchedDeptUsers = await chatService.getDepartmentUsers(selectedDepartmentId);
                setDepartmentUsers(fetchedDeptUsers || []);
            } catch (err) {
                console.error(`Failed to fetch users for department ${selectedDepartmentId}:`, err);
                setDepartmentUsersError(err.message || `Failed to load users for department.`);
            } finally {
                setIsLoadingDepartmentUsers(false);
            }
        };
        fetchDeptUsers();
    }, [selectedDepartmentId]);

    const handleDepartmentSelect = useCallback((departmentId) => {
        setSelectedDepartmentId(departmentId);
    }, []);

    const selectedDepartment = departments.find(d => d.id === selectedDepartmentId);

    return (
        <div style={organizationPageStyle}>
            <div style={sectionStyle}>
                <h2>All Users</h2>
                {isLoadingUsers && <p>Loading users...</p>}
                {usersError && <p style={{ color: 'red' }}>{usersError}</p>}
                {!isLoadingUsers && !usersError && <UserList users={users} />}
            </div>

            <div style={sectionStyle}>
                <h2>Departments</h2>
                {isLoadingDepartments && <p>Loading departments...</p>}
                {departmentsError && <p style={{ color: 'red' }}>{departmentsError}</p>}
                {!isLoadingDepartments && !departmentsError && (
                    <DepartmentList
                        departments={departments}
                        onDepartmentSelect={handleDepartmentSelect}
                        currentDepartmentId={selectedDepartmentId}
                    />
                )}

                {selectedDepartmentId && (
                    <div style={departmentDetailStyle}>
                        <h3>
                            Users in {selectedDepartment ? `"${selectedDepartment.name}"` : 'Selected Department'}
                        </h3>
                        {isLoadingDepartmentUsers && <p>Loading department users...</p>}
                        {departmentUsersError && <p style={{ color: 'red' }}>{departmentUsersError}</p>}
                        {!isLoadingDepartmentUsers && !departmentUsersError && (
                            <UserList users={departmentUsers} title="" /> // Title provided by h3 above
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default OrganizationPage;
