import React from 'react';

function DepartmentList({ departments, onDepartmentSelect, currentDepartmentId, title = "Departments" }) {
    if (!departments || departments.length === 0) {
        return (
            <div>
                <h4>{title}</h4>
                <p>No departments to display.</p>
            </div>
        );
    }

    return (
        <div>
            <h4>{title}</h4>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {departments.map((dept) => (
                    <li
                        key={dept.id}
                        onClick={() => onDepartmentSelect(dept.id)}
                        style={{
                            padding: '8px',
                            cursor: 'pointer',
                            backgroundColor: dept.id === currentDepartmentId ? '#e0e0e0' : 'transparent',
                            borderBottom: '1px solid #eee'
                        }}
                    >
                        {dept.name}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DepartmentList;
