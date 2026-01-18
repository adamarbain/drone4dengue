"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import { useAuth } from "@/context/AuthContext"
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiArrowDown,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
  FiX,
  FiSave,
  FiUserPlus,
  FiMapPin,
  FiCheckCircle,
  FiClock,
  FiActivity,
} from "react-icons/fi"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import type { JSX } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

const statusStyles: Record<string, string> = {
  "In Progress": "text-blue-600 bg-blue-100 border-blue-200",
  Verified: "text-green-600 bg-green-100 border-green-200",
  Pending: "text-yellow-800 bg-yellow-100 border-yellow-200",
  Unregistered: "text-gray-500 bg-gray-200 border-gray-300",
}

const statusIcons: Record<string, JSX.Element> = {
  "In Progress": <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>,
  Verified: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  Pending: <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>,
  Unregistered: <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>,
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.2,
    },
  },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export default function UserManagementPage() {
  const { companyId, company } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openModalCreateUser, setOpenModalCreateUser] = useState(false)
  const [creating, setCreating] = useState(false)

  // Bulk create users modal & state
  type BulkUser = {
    email: string
    role: "user" | "admin"
    status?: "pending" | "success" | "error"
    errorMessage?: string
  }
  const [openModalBulkCreate, setOpenModalBulkCreate] = useState(false)
  const [bulkUsers, setBulkUsers] = useState<BulkUser[]>([
    { email: "", role: "user" },
    { email: "", role: "user" },
    { email: "", role: "user" },
  ])
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0) // 0–1
  const [bulkSummaryMessage, setBulkSummaryMessage] = useState<string | null>(null)

  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDialogMessage, setSuccessDialogMessage] = useState("");

  const resetNewUser = () => {
    setNewUser({
      email: "",
      role: "user",
      companyId: companyId ?? "",
    })
    setError(null)
  }

  const resetBulkUsers = () => {
    setBulkUsers([
      { email: "", role: "user" },
      { email: "", role: "user" },
      { email: "", role: "user" },
    ])
    setBulkCreating(false)
    setBulkProgress(0)
    setBulkSummaryMessage(null)
    setError(null)
  }

  const [newUser, setNewUser] = useState<any>({
    email: "",
    role: "user",
    companyId: companyId ?? "",
  })

  const isEmailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const [updating, setUpdating] = useState(false)
  const [updateUser, setUpdateUser] = useState<any>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    onConfirm: () => void
    type: "danger" | "warning" | "info"
  } | null>(null)

  const [filterOpen, setFilterOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [filterRole, setFilterRole] = useState<string>("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Helper: Auth headers
  const getAuthHeaders = () => {
    const TOKEN = typeof window !== "undefined" ? localStorage.getItem("token") : null
    return {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (filterStatus) params.append("status", filterStatus)
      if (filterRole) params.append("role", filterRole)
      // Send a large limit to fetch all users (frontend handles pagination)
      params.append("limit", "10000")
      params.append("page", "1")
      const res = await fetch(`${API_URL}/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error("Failed to fetch users")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/users/summary/dashboard`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error("Failed to fetch summary")
      const data = await res.json()
      setSummary(data)
    } catch (err) {
      console.error("Failed to fetch summary:", err)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchSummary()
    // eslint-disable-next-line
  }, [searchTerm, filterStatus, filterRole])

  useEffect(() => {
    if (companyId) {
      setNewUser((prev: any) => ({ ...prev, companyId }))
    }
  }, [companyId])

  // Create user - Admin only needs to provide email and role
  // Password is auto-generated and sent to user's email
  const handleCreateUser = async () => {
    setError(null)

    // Validation - only email is required from admin
    if (!isEmailValid(newUser.email)) {
      setError("Please enter a valid email address")
      return
    }

    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/users/invite`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: newUser.email,
          role: newUser.role,
          companyId: newUser.companyId,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        if (res.status === 400 && errData.error?.includes("already registered")) {
          throw new Error("Email already registered")
        }
        if (res.status === 409) {
          throw new Error("Email already registered")
        }
        throw new Error(errData.error || "Failed to create user")
      }
      resetNewUser()
      setCreating(false)
      setOpenModalCreateUser(false)
      setSuccessDialogMessage("User created successfully! Login credentials have been sent to the user's email. They will need to verify their email address on first login.")
      setShowSuccessDialog(true)
      fetchUsers()
      fetchSummary()
    } catch (err: any) {
      setError(err.message)
      setCreating(false)
    }
  }

  // Delete user
  const handleDeleteUser = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete User",
      message: "Are you sure you want to delete this user? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmDialog(null)
        setError(null)
        try {
          const res = await fetch(`${API_URL}/users/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
          })
          if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.error || "Failed to delete user")
          }
          setSuccessDialogMessage("User deleted successfully.")
          setShowSuccessDialog(true)
          fetchUsers()
          fetchSummary()
        } catch (err: any) {
          setError(err.message)
        }
      },
    })
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Selected Users",
      message: `Are you sure you want to delete ${selectedUsers.length} selected users? This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmDialog(null)
        setError(null)
        try {
          const res = await fetch(`${API_URL}/users/bulk-delete`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ ids: selectedUsers }),
          })
          if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.error || "Failed to bulk delete users")
          }
          const count = selectedUsers.length;
          setSelectedUsers([])
          setSuccessDialogMessage(`${count} users deleted successfully.`)
          setShowSuccessDialog(true)
          fetchUsers()
          fetchSummary()
        } catch (err: any) {
          setError(err.message)
        }
      },
    })
  }

  // Update user profile
  const handleUpdateProfile = async () => {
    if (!updateUser) return
    setUpdating(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/users/${updateUser.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(updateUser),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to update user")
      }
      setUpdateUser(null)
      setUpdating(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
      setUpdating(false)
    }
  }

  // Update user status
  const handleUpdateStatus = async (id: string, status: string) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/users/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to update status")
      }
      fetchUsers()
      fetchSummary()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // UI helpers
  const toggleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map((u) => u.id))
    }
  }

  // Filtered users (search is server-side)
  const filteredUsers = users

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when filters or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterRole, itemsPerPage])

  // CSV Export Function
  const exportToCSV = () => {
    if (!users.length) return
    const replacer = (key: string, value: any) => (value === null ? "" : value)
    const header = Object.keys(users[0])
    const csv = [
      header.join(","),
      ...users.map((row) => header.map((fieldName) => JSON.stringify(row[fieldName], replacer)).join(",")),
    ].join("\r\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "users.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row overflow-hidden">
      <AdminSidebar current="User Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-primary-dark mb-1">User Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
              <div className="text-lg text-gray-600">
                Manage all users within your company. Users can only see and manage data from their own company.
              </div>
            </div>
          </motion.div>

          {/* Quick Action */}
          <motion.div variants={item} className="mb-8 flex gap-4">
            <button
              className="bg-accent-blue text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-secondary-blue transition-all flex items-center gap-2 shadow-md"
              onClick={() => setOpenModalCreateUser(true)}
            >
              <FiPlus />
              Add New User
            </button>
            <button
              className="bg-white text-accent-blue border border-accent-blue px-8 py-3 rounded-lg font-bold text-base hover:bg-accent-blue hover:text-white transition-all flex items-center gap-2 shadow-md"
              onClick={() => {
                resetBulkUsers()
                setOpenModalBulkCreate(true)
              }}
            >
              <FiUserPlus />
              Bulk Add Users
            </button>
            <button
              className="bg-white text-accent-blue border border-accent-blue px-8 py-3 rounded-lg font-bold text-base hover:bg-accent-blue hover:text-white transition-all flex items-center gap-2"
              onClick={handleBulkDelete}
              disabled={selectedUsers.length === 0}
            >
              <FiTrash2 />
              Delete Selected
            </button>
          </motion.div>

          {/* User Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Users", value: summary.total || 0, color: "bg-blue-500" },
              { label: "Active Users", value: summary.active || 0, color: "bg-green-500" },
              { label: "Pending Users", value: summary.pending || 0, color: "bg-yellow-500" },
              { label: "Admin Users", value: summary.admin || 0, color: "bg-purple-500" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-gray-600 text-sm">{stat.label}</div>
                  </div>
                  <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                    <FiShield className="text-white" />
                  </div>
                </div>
                <div className={`h-1 ${stat.color} mt-4 rounded-full`}></div>
              </div>
            ))}
          </motion.div>

          {/* Status Management Quick Actions */}
          <motion.div variants={item} className="mb-8">
            <div className="bg-white rounded-xl p-6 shadow-md border border-accent-blue/30">
              <div className="font-bold text-lg mb-4 flex items-center gap-2">
                <FiCheckCircle className="text-accent-blue" />
                Quick Status Actions
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiClock className="text-yellow-600" />
                      <span className="font-medium text-yellow-800">Pending Users</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {users.filter((u) => u.status === "Pending").length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const pendingUsers = users.filter((u) => u.status === "Pending")
                      if (pendingUsers.length > 0) {
                        setConfirmDialog({
                          isOpen: true,
                          title: "Verify All Pending Users",
                          message: `Are you sure you want to verify all ${pendingUsers.length} pending users? They will gain access to the system.`,
                          confirmText: "Verify All",
                          cancelText: "Cancel",
                          type: "info",
                          onConfirm: async () => {
                            setConfirmDialog(null)
                            pendingUsers.forEach((user) => handleUpdateStatus(user.id, "Verified"))
                          },
                        })
                      }
                    }}
                    className="w-full mt-2 bg-yellow-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
                    disabled={users.filter((u) => u.status === "Pending").length === 0}
                  >
                    Verify All Pending
                  </button>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className="text-green-600" />
                      <span className="font-medium text-green-800">Verified Users</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {users.filter((u) => u.status === "Verified").length}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 mt-2">Users with verified status</div>
                </div>

                {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FiActivity className="text-blue-600" />
                      <span className="font-medium text-blue-800">In Progress</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {users.filter((u) => u.status === "In Progress").length}
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">Users currently in progress</div>
                </div> */}
              </div>
            </div>
          </motion.div>

          {/* Error/Loading */}
          {error && <div className="text-red-600 mb-4">{error}</div>}
          {loading && <div className="text-gray-600 mb-4">Loading users...</div>}

          {/* User List Table */}
          <motion.div variants={item} className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-xl">User List</div>
              <div className="text-sm text-gray-500">
                {selectedUsers.length > 0 && `${selectedUsers.length} users selected`}
              </div>
            </div>

            {/* Enhanced Header */}
            <div className="bg-accent-blue rounded-t-xl px-6 py-4 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  className="bg-white text-accent-blue rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setOpenModalCreateUser(true)}
                >
                  <FiPlus />
                </button>
                <div className="relative">
                  <button
                    className="bg-white text-accent-blue rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setFilterOpen(!filterOpen)}
                  >
                    <FiFilter />
                  </button>
                  {filterOpen && (
                    <div className="absolute left-0 mt-2 z-20 bg-white border rounded shadow-lg p-4 w-64">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status:</label>
                        <select
                          className="w-full border rounded mt-1"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="">All</option>
                          <option value="Verified">Verified</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700">Role:</label>
                        <select
                          className="w-full border rounded mt-1"
                          value={filterRole}
                          onChange={(e) => setFilterRole(e.target.value)}
                        >
                          <option value="">All</option>
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          className="bg-accent-blue text-white px-3 py-1 rounded"
                          onClick={() => {
                            setFilterOpen(false)
                            fetchUsers()
                          }}
                        >
                          Apply
                        </button>
                        <button
                          className="bg-gray-200 px-3 py-1 rounded"
                          onClick={() => {
                            setFilterStatus("")
                            setFilterRole("")
                            setFilterOpen(false)
                            fetchUsers()
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="bg-white text-accent-blue rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  onClick={exportToCSV}
                  title="Export to CSV"
                >
                  <FiArrowDown />
                </button>
              </div>
              <div className="flex-1" />
              <div className="relative">
                <div className="flex items-center bg-white/10 rounded-lg">
                  <FiSearch className="ml-3 text-white" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-white placeholder-white/70 px-3 py-2 w-64 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-b-xl bg-white shadow-lg">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-primary-dark font-semibold text-base border-b border-gray-200 bg-light-bg">
                    <th className="py-4 px-6">
                      <input
                        type="checkbox"
                        className="accent-accent-blue rounded"
                        checked={selectedUsers.length === users.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="py-4 px-6">User ID</th>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Address</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      className={`border-b border-gray-100 last:border-0 hover:bg-light-bg/50 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          className="accent-accent-blue rounded"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                        />
                      </td>
                      <td className="py-4 px-6 font-medium">{user.userId || user.id}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Image
                              src={"/images/user1.jpg"}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover border-2 border-accent-blue"
                            />
                            {user.status === "Verified" && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <FiMail size={12} />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">{user.address || "-"}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <FiPhone size={12} />
                          {user.phone || "-"}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-700 border-purple-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center w-fit ${statusStyles[user.status]}`}
                          >
                            {statusIcons[user.status]}
                            {user.status}
                          </span>
                          {user.status === "Pending" && (
                            <button
                              onClick={() => handleUpdateStatus(user.id, "Verified")}
                              className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                              title="Verify User"
                            >
                              <FiCheckCircle size={12} />
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 rounded-lg hover:bg-light-bg/50 text-accent-blue transition-colors"
                            onClick={() => setUpdateUser(user)}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center justify-between mt-4 px-6 py-3 bg-gray-50 rounded-b-xl">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Rows per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg border transition-colors ${
                            currentPage === pageNum
                              ? 'bg-accent-blue text-white border-accent-blue'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.section>

        {/* Bulk Create Users Modal */}
        <AnimatePresence>
          {openModalBulkCreate && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                if (bulkCreating) return
                setOpenModalBulkCreate(false)
                resetBulkUsers()
              }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-accent-blue to-secondary-blue px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <FiUserPlus className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Bulk Add Users</h2>
                        <p className="text-white/80 text-sm">
                          Invite many users at once and set their roles easily.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (bulkCreating) return
                        setOpenModalBulkCreate(false)
                        resetBulkUsers()
                      }}
                      className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-40"
                      disabled={bulkCreating}
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Info Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FiMail className="text-blue-600 mt-0.5" size={18} />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Bulk invite details:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>Each row represents one new user.</li>
                          <li>Set the email and role (`user` or `admin`) for every user.</li>
                          <li>
                            Passwords are auto-generated and login credentials are emailed to the users. They must
                            verify their email on first login.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar when processing */}
                  {bulkCreating && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1 text-sm text-gray-600">
                        <span>Inviting users...</span>
                        <span>{Math.round(bulkProgress * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-accent-blue transition-all"
                          style={{ width: `${Math.round(bulkProgress * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Summary message */}
                  {bulkSummaryMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {bulkSummaryMessage}
                    </div>
                  )}

                  {/* Bulk user rows */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Users to invite ({bulkUsers.length})
                      </span>
                      <button
                        type="button"
                        className="text-xs px-3 py-1 rounded-full bg-accent-blue text-white hover:bg-secondary-blue transition-colors disabled:opacity-50"
                        onClick={() =>
                          setBulkUsers((prev) => [...prev, { email: "", role: "user" }])
                        }
                        disabled={bulkCreating || bulkUsers.length >= 50}
                      >
                        + Add Row
                      </button>
                    </div>
                    <div className="max-h-[40vh] overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left w-12">#</th>
                            <th className="px-4 py-2 text-left">Email</th>
                            <th className="px-4 py-2 text-left w-40">Role</th>
                            <th className="px-4 py-2 text-left w-32">Status</th>
                            <th className="px-4 py-2 text-right w-16">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkUsers.map((u, idx) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                              <td className="px-4 py-2 align-top text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-2 align-top">
                                <input
                                  type="email"
                                  placeholder="user@example.com"
                                  value={u.email}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setBulkUsers((prev) =>
                                      prev.map((row, i) =>
                                        i === idx
                                          ? {
                                              ...row,
                                              email: value,
                                              status: undefined,
                                              errorMessage: undefined,
                                            }
                                          : row,
                                      ),
                                    )
                                  }}
                                  disabled={bulkCreating}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent text-sm"
                                />
                                {u.email.trim() !== "" && !isEmailValid(u.email) && !u.errorMessage && (
                                  <p className="mt-1 text-xs text-red-600">
                                    Please enter a valid email address.
                                  </p>
                                )}
                                {u.status === "error" && u.errorMessage && (
                                  <p className="mt-1 text-xs text-red-600">{u.errorMessage}</p>
                                )}
                              </td>
                              <td className="px-4 py-2 align-top">
                                <select
                                  value={u.role}
                                  onChange={(e) => {
                                    const value = e.target.value as "user" | "admin"
                                    setBulkUsers((prev) =>
                                      prev.map((row, i) =>
                                        i === idx
                                          ? { ...row, role: value, status: undefined }
                                          : row,
                                      ),
                                    )
                                  }}
                                  disabled={bulkCreating}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent text-sm"
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 align-top">
                                {u.status === "success" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                                    Success
                                  </span>
                                )}
                                {u.status === "error" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-700 text-xs border border-red-200">
                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                                    Failed
                                  </span>
                                )}
                                {u.status === "pending" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs border border-yellow-200">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5 animate-pulse"></span>
                                    Processing
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 align-top text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBulkUsers((prev) =>
                                      prev.filter((_, i) => i !== idx),
                                    )
                                  }
                                  disabled={bulkCreating || bulkUsers.length <= 1}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3 items-center">
                  <button
                    onClick={() => {
                      if (bulkCreating) return
                      setOpenModalBulkCreate(false)
                      resetBulkUsers()
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
                    disabled={bulkCreating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setError(null)
                      setBulkSummaryMessage(null)

                      // Filter out completely empty rows
                      const toInvite = bulkUsers.filter((u) => u.email.trim() !== "")

                      if (!toInvite.length) {
                        setError("Please provide at least one email to invite.")
                        return
                      }

                      // Validate emails
                      const invalidIndex = toInvite.findIndex(
                        (u) => !isEmailValid(u.email),
                      )
                      if (invalidIndex !== -1) {
                        setError(
                          `Row ${invalidIndex + 1}: Please enter a valid email address.`,
                        )
                        return
                      }

                      setBulkCreating(true)
                      setBulkProgress(0)

                      // Mark all selected rows as pending
                      setBulkUsers((prev) =>
                        prev.map((row) =>
                          row.email.trim() !== ""
                            ? { ...row, status: "pending", errorMessage: undefined }
                            : row,
                        ),
                      )

                      const total = toInvite.length
                      let successCount = 0
                      let failCount = 0

                      for (let i = 0; i < total; i++) {
                        const u = toInvite[i]
                        try {
                          const res = await fetch(`${API_URL}/users/invite`, {
                            method: "POST",
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                              email: u.email,
                              role: u.role,
                              companyId: companyId ?? "",
                            }),
                          })

                          if (!res.ok) {
                            const errData = await res.json().catch(() => ({}))
                            let message =
                              errData.error ||
                              "Failed to invite user. Please try again."
                            if (
                              res.status === 400 &&
                              typeof errData.error === "string" &&
                              errData.error.includes("already registered")
                            ) {
                              message = "Email already registered."
                            }
                            if (res.status === 409) {
                              message = "Email already registered."
                            }

                            failCount += 1
                            setBulkUsers((prev) =>
                              prev.map((row) =>
                                row.email === u.email
                                  ? {
                                      ...row,
                                      status: "error",
                                      errorMessage: message,
                                    }
                                  : row,
                              ),
                            )
                          } else {
                            successCount += 1
                            setBulkUsers((prev) =>
                              prev.map((row) =>
                                row.email === u.email
                                  ? { ...row, status: "success" }
                                  : row,
                              ),
                            )
                          }
                        } catch (err: any) {
                          failCount += 1
                          setBulkUsers((prev) =>
                            prev.map((row) =>
                              row.email === u.email
                                ? {
                                    ...row,
                                    status: "error",
                                    errorMessage:
                                      err?.message ||
                                      "Unexpected error inviting user.",
                                  }
                                : row,
                            ),
                          )
                        } finally {
                          setBulkProgress((i + 1) / total)
                        }
                      }

                      if (successCount > 0) {
                        fetchUsers()
                        fetchSummary()
                      }

                      const parts = []
                      if (successCount) parts.push(`${successCount} succeeded`)
                      if (failCount) parts.push(`${failCount} failed`)
                      setBulkSummaryMessage(
                        parts.length
                          ? `Bulk invite completed: ${parts.join(", ")}.`
                          : "No users were invited.",
                      )

                      setBulkCreating(false)
                    }}
                    disabled={
                      bulkCreating ||
                      bulkUsers.every((u) => u.email.trim() === "")
                    }
                    className="flex-1 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {bulkCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Inviting Users...
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        Invite All Users
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Create User Modal */}
        <AnimatePresence>
          {openModalCreateUser && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                setOpenModalCreateUser(false)
                resetNewUser()
              }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-accent-blue to-secondary-blue px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <FiUserPlus className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Add New User</h2>
                        <p className="text-white/80 text-sm">Create a new user account</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOpenModalCreateUser(false)
                        resetNewUser()
                      }}
                      className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Info Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FiMail className="text-blue-600 mt-0.5" size={18} />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">How it works:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>A password will be auto-generated for the new user</li>
                          <li>Login credentials will be sent to the user's email</li>
                          <li>User will need to verify their email address on first login</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Email Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMail className="text-accent-blue" size={16} />
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Role Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-accent-blue" size={16} />
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* Company Field - Read Only */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-accent-blue" size={16} />
                        Company
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        {company?.name ?? "Company not available"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => {
                      setOpenModalCreateUser(false)
                      resetNewUser()
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                    <button
                      onClick={handleCreateUser}
                      disabled={creating || !newUser.email}
                      className="flex-1 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating & Sending Email...
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        Create User & Send Invite
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Update User Modal */}
        <AnimatePresence>
          {updateUser && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setUpdateUser(null)}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-accent-blue to-secondary-blue px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <FiEdit2 className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Update User</h2>
                        <p className="text-white/80 text-sm">Edit user information</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUpdateUser(null)}
                      className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* User Avatar */}
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <Image
                          src="/images/user1.jpg"
                          alt={updateUser.name}
                          width={80}
                          height={80}
                          className="rounded-full object-cover border-4 border-accent-blue"
                        />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center">
                          <FiEdit2 className="text-white" size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiUser className="text-accent-blue" size={16} />
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter full name"
                        value={updateUser.name}
                        onChange={(e) => setUpdateUser({ ...updateUser, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Email Field - Read Only */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMail className="text-accent-blue" size={16} />
                        Email Address
                        <span className="text-xs text-gray-400">(cannot be changed)</span>
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        {updateUser.email}
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiPhone className="text-accent-blue" size={16} />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={updateUser.phone || ""}
                        onChange={(e) => setUpdateUser({ ...updateUser, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Address Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMapPin className="text-accent-blue" size={16} />
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="Enter address"
                        value={updateUser.address || ""}
                        onChange={(e) => setUpdateUser({ ...updateUser, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Role Field - Read Only */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-accent-blue" size={16} />
                        Role
                        <span className="text-xs text-gray-400">(cannot be changed)</span>
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 capitalize">
                        {updateUser.role || "user"}
                      </div>
                    </div>


                    {/* Company Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-accent-blue" size={16} />
                        Company
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        {company?.name ?? "Company not available"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setUpdateUser(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={updating || !updateUser.name || !updateUser.email}
                    className="flex-1 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-secondary-blue transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        Update User
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Beautiful Confirmation Modal */}
        <AnimatePresence>
          {confirmDialog && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setConfirmDialog(null)}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div
                  className={`px-6 py-4 ${
                    confirmDialog.type === "danger"
                      ? "bg-gradient-to-r from-red-500 to-red-600"
                      : confirmDialog.type === "warning"
                        ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                        : "bg-gradient-to-r from-blue-500 to-blue-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      {confirmDialog.type === "danger" && <FiTrash2 className="text-white text-lg" />}
                      {confirmDialog.type === "warning" && <FiActivity className="text-white text-lg" />}
                      {confirmDialog.type === "info" && <FiCheckCircle className="text-white text-lg" />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{confirmDialog.title}</h2>
                      <p className="text-white/80 text-sm">Please confirm your action</p>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        confirmDialog.type === "danger"
                          ? "bg-red-100"
                          : confirmDialog.type === "warning"
                            ? "bg-yellow-100"
                            : "bg-blue-100"
                      }`}
                    >
                      {confirmDialog.type === "danger" && <FiTrash2 className="text-red-600 text-xl" />}
                      {confirmDialog.type === "warning" && <FiActivity className="text-yellow-600 text-xl" />}
                      {confirmDialog.type === "info" && <FiCheckCircle className="text-blue-600 text-xl" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 leading-relaxed">{confirmDialog.message}</p>
                      {confirmDialog.type === "danger" && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-700 text-sm font-medium">⚠️ This action is irreversible</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    {confirmDialog.cancelText}
                  </button>
                  <button
                    onClick={confirmDialog.onConfirm}
                    className={`flex-1 px-4 py-3 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                      confirmDialog.type === "danger"
                        ? "bg-red-600 hover:bg-red-700"
                        : confirmDialog.type === "warning"
                          ? "bg-yellow-600 hover:bg-yellow-700"
                          : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {confirmDialog.type === "danger" && <FiTrash2 size={16} />}
                    {confirmDialog.type === "warning" && <FiActivity size={16} />}
                    {confirmDialog.type === "info" && <FiCheckCircle size={16} />}
                    {confirmDialog.confirmText}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Dialog */}
        <AnimatePresence>
          {showSuccessDialog && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setShowSuccessDialog(false)}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiCheckCircle className="text-green-600 text-4xl" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
                  <p className="text-gray-600 mb-8">{successDialogMessage}</p>
                  <button
                    onClick={() => setShowSuccessDialog(false)}
                    className="w-full bg-accent-blue text-white py-3 rounded-xl font-bold hover:bg-secondary-blue transition-colors"
                  >
                    Great!
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
