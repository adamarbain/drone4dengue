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
  const { companyId } = useAuth()
  const company = useAuth().company
  const [users, setUsers] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openModalCreateUser, setOpenModalCreateUser] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState<any>({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    role: "user",
    companyId: "", // Add company field
  })
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

  // Create user
  const handleCreateUser = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newUser),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to create user")
      }
      setNewUser({ name: "", email: "", password: "", phone: "", address: "", role: "user", companyId: "" })
      setCreating(false)
      setOpenModalCreateUser(false)
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
          setSelectedUsers([])
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

  // Update user permission (role)
  const handleUpdatePermission = async (id: string, role: string) => {
    setError(null)
    try {
      const res = await fetch(`${API_URL}/users/${id}/permissions`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to update permission")
      }
      fetchUsers()
      fetchSummary()
    } catch (err: any) {
      setError(err.message)
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
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="User Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">User Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">
                Manage all users within your company. Users can only see and manage data from their own company.
              </div>
            </div>
          </motion.div>

          {/* Quick Action */}
          <motion.div variants={item} className="mb-8 flex gap-4">
            <button
              className="bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-all flex items-center gap-2 shadow-md"
              onClick={() => setOpenModalCreateUser(true)}
            >
              <FiPlus />
              Add New User
            </button>
            <button
              className="bg-white text-[#A21C1C] border border-[#A21C1C] px-8 py-3 rounded-lg font-bold text-base hover:bg-[#FFF7E3] transition-all flex items-center gap-2"
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
              <div key={stat.label} className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30">
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
            <div className="bg-white rounded-xl p-6 shadow-md border border-[#E2C275]/30">
              <div className="font-bold text-lg mb-4 flex items-center gap-2">
                <FiCheckCircle className="text-[#A21C1C]" />
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
            <div className="bg-[#A21C1C] rounded-t-xl px-6 py-4 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  className="bg-white text-[#A21C1C] rounded-lg p-2 hover:bg-gray-100 transition-colors"
                  onClick={() => setOpenModalCreateUser(true)}
                >
                  <FiPlus />
                </button>
                <div className="relative">
                  <button
                    className="bg-white text-[#A21C1C] rounded-lg p-2 hover:bg-gray-100 transition-colors"
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
                          className="bg-[#A21C1C] text-white px-3 py-1 rounded"
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
                  className="bg-white text-[#A21C1C] rounded-lg p-2 hover:bg-gray-100 transition-colors"
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
                  <tr className="text-left text-black font-semibold text-base border-b border-gray-200 bg-[#F3EAD8]">
                    <th className="py-4 px-6">
                      <input
                        type="checkbox"
                        className="accent-[#A21C1C] rounded"
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
                  {filteredUsers.map((user, idx) => (
                    <motion.tr
                      key={user.id}
                      className={`border-b border-gray-100 last:border-0 hover:bg-[#FFF7E3]/50 transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <td className="py-4 px-6">
                        <input
                          type="checkbox"
                          className="accent-[#A21C1C] rounded"
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
                              className="rounded-full object-cover border-2 border-[#E2C275]"
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
                        <button
                          className="ml-2 text-xs underline text-blue-600"
                          onClick={() => handleUpdatePermission(user.id, user.role === "admin" ? "user" : "admin")}
                        >
                          Set as {user.role === "admin" ? "User" : "Admin"}
                        </button>
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
                            className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C] transition-colors"
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
          </motion.div>
        </motion.section>

        {/* Enhanced Create User Modal */}
        <AnimatePresence>
          {openModalCreateUser && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setOpenModalCreateUser(false)}
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
                <div className="bg-gradient-to-r from-[#A21C1C] to-[#7C1D1D] px-6 py-4">
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
                      onClick={() => setOpenModalCreateUser(false)}
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
                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiUser className="text-[#A21C1C]" size={16} />
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter full name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMail className="text-[#A21C1C]" size={16} />
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Phone Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiPhone className="text-[#A21C1C]" size={16} />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Address Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMapPin className="text-[#A21C1C]" size={16} />
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="Enter address"
                        value={newUser.address}
                        onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Role Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-[#A21C1C]" size={16} />
                        Role
                      </label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-[#A21C1C]" size={16} />
                        Password
                      </label>
                      <input
                        type="password"
                        placeholder="Enter password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Company Field - Note: This will be automatically set to current user's company */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-[#A21C1C]" size={16} />
                        Company
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        {company.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setOpenModalCreateUser(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={creating || !newUser.name || !newUser.email || !newUser.password}
                    className="flex-1 px-4 py-3 bg-[#A21C1C] text-white rounded-lg hover:bg-[#7C1D1D] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        Create User
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
                <div className="bg-gradient-to-r from-[#A21C1C] to-[#7C1D1D] px-6 py-4">
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
                          className="rounded-full object-cover border-4 border-[#E2C275]"
                        />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#A21C1C] rounded-full flex items-center justify-center">
                          <FiEdit2 className="text-white" size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiUser className="text-[#A21C1C]" size={16} />
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter full name"
                        value={updateUser.name}
                        onChange={(e) => setUpdateUser({ ...updateUser, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMail className="text-[#A21C1C]" size={16} />
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={updateUser.email}
                        onChange={(e) => setUpdateUser({ ...updateUser, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Phone Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiPhone className="text-[#A21C1C]" size={16} />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter phone number"
                        value={updateUser.phone || ""}
                        onChange={(e) => setUpdateUser({ ...updateUser, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Address Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiMapPin className="text-[#A21C1C]" size={16} />
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="Enter address"
                        value={updateUser.address || ""}
                        onChange={(e) => setUpdateUser({ ...updateUser, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Role Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-[#A21C1C]" size={16} />
                        Role
                      </label>
                      <select
                        value={updateUser.role || "user"}
                        onChange={(e) => setUpdateUser({ ...updateUser, role: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E2C275] focus:border-transparent transition-all"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>


                    {/* Company Field */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FiShield className="text-[#A21C1C]" size={16} />
                        Company
                      </label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                        {company.name}
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
                    className="flex-1 px-4 py-3 bg-[#A21C1C] text-white rounded-lg hover:bg-[#7C1D1D] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </main>
    </div>
  )
}
