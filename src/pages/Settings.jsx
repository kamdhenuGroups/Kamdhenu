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

// Constants moved outside component to prevent re-creation
const ITEMS_PER_PAGE = 6;

const ALL_PAGES = [
    { id: 'my-profile', label: 'My Profile' },
    { id: 'settings', label: 'Settings' },
    { id: 'new-order', label: 'New Order' },
    { id: 'leads', label: 'Leads' }
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
        <div className="h-full flex flex-col gap-4 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 mb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage system users, teams, and access permissions.</p>
                </div>

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
            <div className="md:hidden flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
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
            <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-slate-200/60 flex-1 min-h-0 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto custom-scrollbar">
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
                                    className="italic"
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
    );
};

// Sub-components for cleaner JSX
const StatItem = ({ label, value }) => (
    <div className="text-right">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
);

const HeaderCell = ({ children, align = 'left' }) => (
    <th className={`px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-${align}`}>
        {children}
    </th>
);

const EmptyRow = ({ message }) => (
    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500">{message}</td></tr>
);

const UserRow = ({ user, onEdit }) => (
    <tr className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
        <td className="py-4 px-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold border border-slate-200 overflow-hidden">
                    {user.profile_picture ? (
                        <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                        user.full_name?.charAt(0).toUpperCase()
                    )}
                </div>
                <div>
                    <p className="font-medium text-slate-800">{user.full_name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5 italic">{user.user_id}</p>
                </div>
            </div>
        </td>
        <td className="px-6 py-4">
            <div className="flex flex-col">
                <span className={`inline-flex self-start items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' || user.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                    {user.role || 'N/A'}
                </span>
                <span className="text-sm text-slate-600 mt-1">{user.designation || '-'}</span>
            </div>
        </td>
        <td className="px-6 py-4 text-sm text-slate-600">{user.department || '-'}</td>
        <td className="px-6 py-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                {user.is_active ? 'Active' : 'Inactive'}
            </span>
        </td>
        <td className="px-6 py-4 text-right">
            <div className="flex items-center justify-end gap-2">
                <button onClick={onEdit} className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors">
                    <Edit2 size={18} />
                </button>
            </div>
        </td>
    </tr>
);

const Pagination = ({ currentPage, totalPages, totalItems, startIndex, endIndex, onPageChange, className }) => (
    <div className={`flex items-center justify-between px-4 py-4 sm:px-6 ${className || ''}`}>
        <div className="flex items-center justify-between w-full">
            <div className="hidden sm:block text-sm text-slate-500">
                Showing <span className="font-medium">{startIndex}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{totalItems}</span> results
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors text-slate-600">
                    <ChevronLeft size={16} />
                </button>
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} onClick={() => onPageChange(page)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${currentPage === page ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                            {page}
                        </button>
                    ))}
                </div>
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors text-slate-600">
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    </div>
);

const MobileUserCard = ({ user, onEdit }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold border border-slate-200 overflow-hidden shrink-0">
                    {user.profile_picture ? (
                        <img src={user.profile_picture} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                        user.full_name?.charAt(0).toUpperCase()
                    )}
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{user.full_name}</h3>
                    <p className="text-xs text-slate-500 truncate">{user.designation || user.role}</p>
                </div>
            </div>
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                {user.is_active ? 'Active' : 'Inactive'}
            </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 border-t border-slate-50 pt-3">
            <div className="flex flex-col">
                <span className="text-xs text-slate-400">Department</span>
                <span className="font-medium truncate">{user.department || '-'}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-slate-400">User ID</span>
                <span className="font-medium truncate italic">{user.user_id}</span>
            </div>
        </div>

        <button
            onClick={onEdit}
            className="w-full mt-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center justify-center gap-2"
        >
            <Edit2 size={14} />
            <span>Edit Profile</span>
        </button>
    </div>
);

const FormField = ({ label, name, value, onChange, type = "text", required, error, icon: Icon, placeholder, disabled, className }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            {Icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-5 w-5 sm:h-4 sm:w-4 text-slate-400" />
                </div>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 sm:py-2 rounded-lg border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-primary focus:ring-primary'
                    } focus:ring-1 outline-none disabled:bg-slate-50 disabled:text-slate-500 text-base sm:text-sm ${className || ''}`}
            />
        </div>
        {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-1">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2.5 sm:py-2 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white text-base sm:text-sm appearance-none"
        >
            <option value="">Select {label}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

const DateField = ({ label, name, value, onChange, error }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 sm:mb-1">{label}</label>
        <input
            type="date"
            name={name}
            value={value}
            onChange={onChange}
            className={`w-full px-4 py-2.5 sm:py-2 rounded-lg border ${error ? 'border-red-500' : 'border-slate-300'} focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base sm:text-sm`}
        />
        {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
);

export default Settings;