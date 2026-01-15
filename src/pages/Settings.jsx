import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Plus,
    Edit2,
    X,
    Shield,
    Mail,
    Phone,
    User,
    Camera,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import ContractorVisibility from '../components/ContractorVisibility';


// Constants moved outside component to prevent re-creation
const ITEMS_PER_PAGE = 6;

const ALL_PAGES = [
    { id: 'my-profile', label: 'My Profile' },
    { id: 'settings', label: 'Settings' },
    { id: 'new-order', label: 'New Order' },
    { id: 'create-order', label: 'Create Order' },
    { id: 'leads', label: 'Leads' },
    { id: 'crm', label: 'CRM' },
    { id: 'order-details', label: 'Order Details' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'add-customers', label: 'Add Customers' },
    { id: 'cac', label: 'CAC' },
    { id: 'add-sites', label: 'Add Sites' },
    { id: 'add-contractors', label: 'Add Contractors' },
];

const DEFAULT_USER_PAGES = ['my-profile'];

const DEFAULT_FORM_DATA = {
    user_id: '',
    full_name: '',
    email: '',
    password: '',
    role: 'RM',
    designation: '',
    department: '',
    page_access: DEFAULT_USER_PAGES,
    phone_number: '',
    date_of_birth: '',
    gender: '',
    current_address: '',
    username: '',
    is_active: true,
    profile_picture: ''
};

const Settings = () => {
    const { user: currentUser } = useAuthStore();

    // State Management
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Pagination & Filter
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);

    // Form & Errors
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState('Manage Users');

    // Fetch Users on Mount
    useEffect(() => {
        fetchUsers();
    }, []);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDepartment]);



    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };



    const resetForm = () => {
        setFormData(DEFAULT_FORM_DATA);
        setEditingUser(null);
        setErrors({});
    };



    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                ...DEFAULT_FORM_DATA, // ensure structure
                ...user,
                password: user.password || '',
                role: user.role || 'RM',
                page_access: user.page_access || DEFAULT_USER_PAGES,
                profile_picture: user.profile_picture || '',
                // Ensure nulls are empty strings for inputs
                designation: user.designation || '',
                department: user.department || '',
                phone_number: user.phone_number || '',
                date_of_birth: user.date_of_birth || '',
                gender: user.gender || '',
                current_address: user.current_address || '',
                username: user.username || ''
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const validateField = (name, value) => {
        if (name === 'phone_number') {
            return value.replace(/[^0-9]/g, '').slice(0, 10);
        }
        if (name === 'user_id') {
            return value.replace(/^0+/, '').toUpperCase();
        }
        return value;
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Clear specific error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        let newValue = type === 'checkbox' ? checked : value;

        // Specific validations/transformations
        if (name === 'phone_number' || name === 'user_id') {
            newValue = validateField(name, value);
        }

        setFormData(prev => {
            const newState = { ...prev, [name]: newValue };

            // Auto-set admin pages
            if (name === 'role' && (newValue === 'admin' || newValue === 'Admin')) {
                newState.page_access = ALL_PAGES.map(p => p.id);
            }
            return newState;
        });

        // Real-time duplicate check for user_id
        if (name === 'user_id') {
            const duplicate = users.find(u => u.user_id === newValue);
            const isConflict = duplicate && (!editingUser || duplicate.user_id !== editingUser.user_id);
            setErrors(prev => ({
                ...prev,
                user_id: isConflict ? 'This User ID is already assigned to another user' : ''
            }));
        }

        // Real-time duplicate check for username
        if (name === 'username') {
            const duplicate = users.find(u => u.username === newValue);
            const isConflict = duplicate && (!editingUser || duplicate.user_id !== editingUser.user_id);
            setErrors(prev => ({
                ...prev,
                username: isConflict ? 'This username is already taken' : ''
            }));
        }
    };

    const scrollToField = (fieldName) => {
        requestAnimationFrame(() => {
            const element = document.getElementsByName(fieldName)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
        });
    };

    const handlePageAccessToggle = (pageId) => {
        setFormData(prev => {
            const currentAccess = prev.page_access || [];
            if (currentAccess.includes(pageId)) {
                return { ...prev, page_access: currentAccess.filter(id => id !== pageId) };
            }
            return { ...prev, page_access: [...currentAccess, pageId] };
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `profile-pictures/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, profile_picture: data.publicUrl }));
            toast.success('Image uploaded successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Error uploading image: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const validateForm = (data) => {
        const newErrors = {};

        if (!data.user_id) newErrors.user_id = 'User ID is required';

        if (!data.username) newErrors.username = 'Username is required';
        else if (/\s/.test(data.username)) newErrors.username = 'Username cannot contain spaces';

        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) newErrors.email = 'Invalid email address';

        if (!data.full_name) newErrors.full_name = 'Full Name is required';

        // Password required only for new users
        if (!editingUser && !data.password) newErrors.password = 'Password is required';

        if (data.phone_number && data.phone_number.length !== 10) {
            newErrors.phone_number = 'Phone number must be exactly 10 digits';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanedData = {
            ...formData,
            user_id: formData.user_id?.trim().toUpperCase(),
            username: formData.username?.trim(),
            email: formData.email?.trim(),
            full_name: formData.full_name?.trim()
        };

        const formErrors = validateForm(cleanedData);
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            scrollToField(Object.keys(formErrors)[0]);
            toast.error('Please Fill the required fields');
            return;
        }

        // Local duplicate check
        const localDuplicate = users.find(u =>
            u.user_id?.toLowerCase() === cleanedData.user_id?.toLowerCase()
        );
        if (localDuplicate && (!editingUser || localDuplicate.user_id !== editingUser.user_id)) {
            setErrors(prev => ({ ...prev, user_id: 'This User ID is already assigned to another user' }));
            scrollToField('user_id');
            toast.error('Duplicate User ID found');
            return;
        }

        try {
            // DB Duplicate Checks
            const [userCheck, usernameCheck] = await Promise.all([
                supabase.from('users').select('user_id').ilike('user_id', cleanedData.user_id),
                supabase.from('users').select('user_id').eq('username', cleanedData.username)
            ]);

            if (userCheck.error) throw userCheck.error;
            if (usernameCheck.error) throw usernameCheck.error;

            const conflictErrors = {};

            const existingIdUser = userCheck.data[0];
            if (existingIdUser && (!editingUser || existingIdUser.user_id !== editingUser.user_id)) {
                conflictErrors.user_id = 'This User ID is already assigned to another user';
            }

            const existingNameUser = usernameCheck.data[0];
            if (existingNameUser && (!editingUser || existingNameUser.user_id !== editingUser.user_id)) {
                conflictErrors.username = 'This Username is already taken';
            }

            if (Object.keys(conflictErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...conflictErrors }));
                scrollToField(Object.keys(conflictErrors)[0]);
                toast.error('Duplicate entry found');
                return;
            }

            // Prepare payload
            const userData = { ...cleanedData };
            if (!userData.date_of_birth) userData.date_of_birth = null;
            if (editingUser && !userData.password) delete userData.password;

            if (editingUser) {
                const { error } = await supabase
                    .from('users')
                    .update(userData)
                    .eq('user_id', editingUser.user_id);

                if (error) throw error;
                toast.success('User updated successfully');

                // Update local session if needed
                if (currentUser && currentUser.user_id === editingUser.user_id) {
                    const updatedUserCompat = {
                        ...currentUser,
                        ...userData,
                        Name: userData.full_name,
                        Admin: (userData.role?.toLowerCase() === 'admin') ? 'Yes' : 'No'
                    };
                    useAuthStore.getState().login(updatedUserCompat);
                    localStorage.setItem('user', JSON.stringify(updatedUserCompat));
                }
            } else {
                const { error } = await supabase.from('users').insert([userData]);
                if (error) throw error;
                toast.success('User created successfully');
            }

            handleCloseModal();
            fetchUsers();

        } catch (error) {
            console.error('Error saving user:', error);
            if (error.message?.includes('invalid input syntax for type date')) {
                setErrors(prev => ({ ...prev, date_of_birth: 'Invalid date format' }));
                toast.error('Please check the date fields');
            } else {
                toast.error(`Error: ${error.message}`);
            }
        }
    };

    // Filter Logic
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = (
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.designation?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            const matchesDepartment = selectedDepartment === 'All' || user.department === selectedDepartment;
            return matchesSearch && matchesDepartment;
        });
    }, [users, searchTerm, selectedDepartment]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    return (
        <div className="flex flex-col gap-4 pb-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="text-slate-500 mt-1 text-sm">Manage system users, teams, and access permissions.</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 mb-2">
                <button
                    onClick={() => setActiveTab('Manage Users')}
                    className={`pb-3 text-sm font-medium transition-all ${activeTab === 'Manage Users' ? 'text-primary border-b-2 border-primary translate-y-[1px]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Manage Users
                </button>
                <button
                    onClick={() => setActiveTab('Contractor Visibility')}
                    className={`pb-3 text-sm font-medium transition-all ${activeTab === 'Contractor Visibility' ? 'text-primary border-b-2 border-primary translate-y-[1px]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Contractor Visibility
                </button>
            </div>

            {activeTab === 'Manage Users' && (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-end gap-4 shrink-0 mb-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="hidden xl:flex items-center gap-6">
                                <StatItem label="Total Users" value={users.length} />
                                <div className="w-px h-8 bg-slate-200"></div>
                                <StatItem
                                    label="Admins"
                                    value={users.filter(u => u.role?.toLowerCase() === 'admin').length}
                                />
                            </div>

                            {!loading && (
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium"
                                >
                                    <Plus size={20} />
                                    <span>Add User</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile View (Cards) */}
                    <div className="md:hidden space-y-3">
                        {loading ? (
                            <div className="text-center py-10 text-slate-500">Loading users...</div>
                        ) : currentItems.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">No users found matching your search.</div>
                        ) : (
                            currentItems.map((user) => (
                                <MobileUserCard
                                    key={user.user_id}
                                    user={user}
                                    onEdit={() => handleOpenModal(user)}
                                />
                            ))
                        )}
                    </div>

                    {/* Desktop View (Table) */}
                    <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-slate-200/60 flex-col">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                                        <HeaderCell>User Details</HeaderCell>
                                        <HeaderCell>Role & Designation</HeaderCell>
                                        <HeaderCell>Department</HeaderCell>
                                        <HeaderCell>Status</HeaderCell>
                                        <HeaderCell align="right">Actions</HeaderCell>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <EmptyRow message="Loading users..." />
                                    ) : currentItems.length === 0 ? (
                                        <EmptyRow message="No users found matching your search." />
                                    ) : (
                                        currentItems.map((user) => (
                                            <UserRow
                                                key={user.user_id}
                                                user={user}
                                                onEdit={() => handleOpenModal(user)}
                                            />
                                        ))
                                    )}
                                    {/* Spacer rows */}
                                    {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - currentItems.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`}><td colSpan="5" className="h-16"></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Desktop Pagination - Integrated in Card */}
                        {!loading && filteredUsers.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredUsers.length}
                                startIndex={(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                endIndex={Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
                                onPageChange={handlePageChange}
                                className="border-t border-slate-100"
                            />
                        )}
                    </div>

                    {/* Pagination */}
                    {/* Mobile Pagination */}
                    {!loading && filteredUsers.length > 0 && (
                        <div className="md:hidden shrink-0 mt-auto">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredUsers.length}
                                startIndex={(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                endIndex={Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}
                                onPageChange={handlePageChange}
                                className="bg-white border-t border-slate-200 rounded-t-xl shadow-sm"
                            />
                        </div>
                    )}

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
                            <div className="relative bg-white rounded-2xl shadow-xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {editingUser ? 'Edit User' : 'Add New User'}
                                    </h2>
                                    <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                                        {/* Profile Picture */}
                                        <div className="col-span-1 md:col-span-2 flex flex-col items-center mb-4">
                                            <div className="relative group">
                                                <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden bg-slate-100 flex items-center justify-center shadow-sm">
                                                    {formData.profile_picture ? (
                                                        <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={40} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-md transform translate-x-1/4 translate-y-1/4">
                                                    {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Camera size={16} />}
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-2">Allowed *.jpeg, *.jpg, *.png, *.gif</p>
                                        </div>

                                        {/* Form Fields */}
                                        <div className="col-span-1 md:col-span-2 border-b pb-2 mb-2 mt-2">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Account Information</h3>
                                        </div>

                                        <FormField
                                            label="User ID" name="user_id" value={formData.user_id}
                                            onChange={handleInputChange} required error={errors.user_id}
                                            icon={Shield} placeholder="Eg: 120"
                                            disabled={!!editingUser && currentUser?.role !== 'admin' && currentUser?.role !== 'Admin'}
                                        />
                                        <FormField
                                            label="Username" name="username" value={formData.username}
                                            onChange={handleInputChange} required error={errors.username}
                                            icon={User} placeholder="jdoe"
                                            className="italic"
                                        />
                                        <FormField
                                            label="Email" name="email" type="email" value={formData.email}
                                            onChange={handleInputChange} error={errors.email}
                                            icon={Mail} placeholder="john@example.com"
                                        />
                                        <FormField
                                            label="Password" name="password" type="text" value={formData.password}
                                            onChange={handleInputChange} required={!editingUser} error={errors.password}
                                            icon={Shield} placeholder={editingUser ? "Leave empty to keep current" : "Enter password"}
                                        />

                                        <div className="col-span-1 md:col-span-2 border-b pb-2 mb-2 mt-2">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Personal Details</h3>
                                        </div>

                                        <FormField
                                            label="Full Name" name="full_name" value={formData.full_name}
                                            onChange={handleInputChange} required error={errors.full_name}
                                            icon={User} placeholder="John Doe"
                                        />
                                        <FormField
                                            label="Phone Number" name="phone_number" value={formData.phone_number}
                                            onChange={handleInputChange} error={errors.phone_number}
                                            icon={Phone} placeholder="10 digit number"
                                        />

                                        <SelectField
                                            label="Gender" name="gender" value={formData.gender}
                                            onChange={handleInputChange} options={['Male', 'Female', 'Other']}
                                        />
                                        <DateField
                                            label="Date of Birth" name="date_of_birth" value={formData.date_of_birth}
                                            onChange={handleInputChange} error={errors.date_of_birth}
                                        />

                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Address</label>
                                            <textarea
                                                name="current_address" value={formData.current_address} onChange={handleInputChange}
                                                rows="2" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                placeholder="Enter address"
                                            ></textarea>
                                        </div>


                                        <div className="col-span-1 md:col-span-2 border-b pb-2 mb-2 mt-2">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Role & Permissions</h3>
                                        </div>

                                        <SelectField
                                            label="Role" name="role" value={formData.role}
                                            onChange={handleInputChange} options={['Admin', 'Sales Head', 'RM', 'CRM']}
                                        />
                                        <SelectField
                                            label="Department" name="department" value={formData.department}
                                            onChange={handleInputChange} options={['SALES', 'MANAGEMENT', 'FINANCE']}
                                        />
                                        <FormField
                                            label="Designation" name="designation" value={formData.designation}
                                            onChange={handleInputChange} icon={Shield} placeholder="Eg: Sales Manager"
                                        />

                                        <div className="col-span-1 md:col-span-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <label className="block text-sm font-medium text-slate-700">Page Access</label>
                                                <div className="flex gap-2 text-xs">
                                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, page_access: ALL_PAGES.map(p => p.id) }))} className="text-primary hover:underline">Select All</button>
                                                    <span className="text-slate-300">|</span>
                                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, page_access: [] }))} className="text-slate-500 hover:underline">None</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                {ALL_PAGES.map(page => (
                                                    <label key={page.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.page_access?.includes(page.id) || false}
                                                            onChange={() => handlePageAccessToggle(page.id)}
                                                            className="rounded text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-sm text-slate-700">{page.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="col-span-1 md:col-span-2 mt-2">
                                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                                                <div className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                </div>
                                                <div>
                                                    <span className="block text-sm font-medium text-slate-900">Active Account</span>
                                                    <span className="block text-xs text-slate-500">Allow this user to log in</span>
                                                </div>
                                            </label>
                                        </div>
                                    </form>
                                </div>

                                <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                                    <button type="button" onClick={handleCloseModal} className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm sm:text-base">Cancel</button>
                                    <button onClick={handleSubmit} className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm text-sm sm:text-base">
                                        {editingUser ? 'Save Changes' : 'Create User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'Contractor Visibility' && (
                <ContractorVisibility users={users} />
            )}
        </div>
    );
};

export default Settings;

// ----------------------------------------------------------------------
// Sub-components (Internal)
// ----------------------------------------------------------------------

const StatItem = ({ label, value }) => (
    <div>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
);

const HeaderCell = ({ children, align = "left" }) => (
    <th className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-${align}`}>
        {children}
    </th>
);

const EmptyRow = ({ message }) => (
    <tr>
        <td colSpan="5" className="px-4 py-8 text-center text-slate-500 text-sm">
            {message}
        </td>
    </tr>
);

const UserRow = ({ user, onEdit }) => (
    <tr className="hover:bg-slate-50/80 transition-colors group">
        <td className="px-4 py-3">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200 overflow-hidden shrink-0">
                    {user.profile_picture ? (
                        <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                        user.full_name?.charAt(0).toUpperCase()
                    )}
                </div>
                <div>
                    <div className="font-medium text-slate-900 text-sm">{user.full_name}</div>
                    <div className="text-xs text-slate-500">{user.user_id}</div>
                </div>
            </div>
        </td>
        <td className="px-4 py-3">
            <div className="flex flex-col">
                <span className="text-sm text-slate-900">{user.role || '-'}</span>
                <span className="text-xs text-slate-500">{user.designation || '-'}</span>
            </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                {user.department || 'General'}
            </span>
        </td>
        <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {user.is_active ? 'Active' : 'Inactive'}
            </span>
        </td>
        <td className="px-4 py-3 text-right">
            <button
                onClick={onEdit}
                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-all opacity-0 group-hover:opacity-100"
                title="Edit User"
            >
                <Edit2 size={16} />
            </button>
        </td>
    </tr>
);

const MobileUserCard = ({ user, onEdit }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200 overflow-hidden shrink-0">
                {user.profile_picture ? (
                    <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                    user.full_name?.charAt(0).toUpperCase()
                )}
            </div>
            <div>
                <h3 className="font-semibold text-slate-900 text-sm">{user.full_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{user.user_id}</span>
                    <span className="text-xs text-slate-500">• {user.role}</span>
                </div>
            </div>
        </div>
        <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
        >
            <Edit2 size={18} />
        </button>
    </div>
);

const FormField = ({ label, icon: Icon, className = "", ...props }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">{label} {props.required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
            <input
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400 ${props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''} ${className}`}
                {...props}
            />
        </div>
        {props.error && <p className="text-red-500 text-xs mt-1 animate-in slide-in-from-top-1">{props.error}</p>}
    </div>
);

const SelectField = ({ label, options, ...props }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="relative">
            <select
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none bg-white"
                {...props}
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
            </div>
        </div>
    </div>
);

const DateField = ({ label, ...props }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <input
            type="date"
            className={`w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-slate-600 ${props.error ? 'border-red-500' : ''}`}
            {...props}
        />
        {props.error && <p className="text-red-500 text-xs mt-1">{props.error}</p>}
    </div>
);

const Pagination = ({ currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange, className }) => (
    <div className={`flex flex-col sm:flex-row items-center justify-between p-4 gap-4 ${className}`}>
        <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{startIndex}</span> to <span className="font-medium text-slate-900">{endIndex}</span> of <span className="font-medium text-slate-900">{totalItems}</span> results
        </p>
        <div className="flex items-center gap-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronLeft size={16} className="text-slate-600" />
            </button>
            <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;

                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {pageNum}
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                <ChevronRight size={16} className="text-slate-600" />
            </button>
        </div>
    </div>
);