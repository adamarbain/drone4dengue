"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiArrowDown,
  FiMoreHorizontal,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiPhone,
  FiShield,
} from "react-icons/fi"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState } from "react"
import type { JSX } from "react"

const users = [
  {
    id: "U-001",
    name: "Natali Craig",
    address: "Meadow Lane Oakland",
    role: "Normal User",
    status: "In Progress",
    avatar: "/images/user1.jpg",
  },
  {
    id: "U-002",
    name: "Kate Morrison",
    address: "Larry San Francisco",
    role: "Normal User",
    status: "Verified",
    avatar: "/images/user2.jpg",
  },
  {
    id: "U-003",
    name: "Drew Cano",
    address: "Bagwell Avenue Ocala",
    role: "Normal User",
    status: "Pending",
    avatar: "/images/user3.jpg",
  },
  {
    id: "U-004",
    name: "Orlando Diggs",
    address: "Washburn Baton Rouge",
    role: "Normal User",
    status: "Verified",
    avatar: "/images/user4.jpg",
    checked: true,
  },
  {
    id: "U-005",
    name: "Andi Lane",
    address: "Nest Lane Olivette",
    role: "Normal User",
    status: "Unregistered",
    avatar: "/images/user5.jpg",
    disabled: true,
  },
  {
    id: "U-006",
    name: "Natali Craig",
    address: "Meadow Lane Oakland",
    role: "Normal User",
    status: "In Progress",
    avatar: "/images/user1.jpg",
  },
  {
    id: "U-007",
    name: "Kate Morrison",
    address: "Larry San Francisco",
    role: "Admin",
    status: "Verified",
    avatar: "/images/user2.jpg",
  },
  {
    id: "U-008",
    name: "Drew Cano",
    address: "Bagwell Avenue Ocala",
    role: "Admin",
    status: "Pending",
    avatar: "/images/user3.jpg",
  },
  {
    id: "U-009",
    name: "Orlando Diggs",
    address: "Washburn Baton Rouge",
    role: "Admin",
    status: "Verified",
    avatar: "/images/user4.jpg",
  },
  {
    id: "U-010",
    name: "Andi Lane",
    address: "Nest Lane Olivette",
    role: "Admin",
    status: "Unregistered",
    avatar: "/images/user5.jpg",
    disabled: true,
  },
]

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

export default function UserManagementPage() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const toggleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId))
    } else {
      setSelectedUsers([...selectedUsers, userId])
    }
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.filter((u) => !u.disabled).length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.filter((u) => !u.disabled).map((u) => u.id))
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="User Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">User Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">
                Manage all users that registered within the same organization.
              </div>
            </div>
          </motion.div>

          {/* Quick Action */}
          <motion.div variants={item} className="mb-8 flex gap-4">
            <button className="bg-[#A21C1C] text-white px-8 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-all flex items-center gap-2 shadow-md">
              <FiPlus />
              Add New User
            </button>
            <button className="bg-white text-[#A21C1C] border border-[#A21C1C] px-8 py-3 rounded-lg font-bold text-base hover:bg-[#FFF7E3] transition-all flex items-center gap-2">
              <FiShield />
              Manage User Permissions
            </button>
          </motion.div>

          {/* User Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Users", value: users.length, color: "bg-blue-500" },
              {
                label: "Active Users",
                value: users.filter((u) => u.status === "Verified").length,
                color: "bg-green-500",
              },
              {
                label: "Pending Users",
                value: users.filter((u) => u.status === "Pending").length,
                color: "bg-yellow-500",
              },
              { label: "Admin Users", value: users.filter((u) => u.role === "Admin").length, color: "bg-purple-500" },
            ].map((stat, idx) => (
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
                <button className="bg-white text-[#A21C1C] rounded-lg p-2 hover:bg-gray-100 transition-colors">
                  <FiPlus />
                </button>
                <button className="bg-white text-[#A21C1C] rounded-lg p-2 hover:bg-gray-100 transition-colors">
                  <FiFilter />
                </button>
                <button className="bg-white text-[#A21C1C] rounded-lg p-2 hover:bg-gray-100 transition-colors">
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
                        checked={selectedUsers.length === users.filter((u) => !u.disabled).length}
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
                        user.disabled ? "bg-gray-50 text-gray-400" : idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"
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
                          disabled={user.disabled}
                        />
                      </td>
                      <td className="py-4 px-6 font-medium">{user.id}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Image
                              src={user.avatar || "/placeholder.svg"}
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
                              {user.name.toLowerCase().replace(" ", ".")}@email.com
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">{user.address}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <FiPhone size={12} />
                          +60 12-345-6789
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            user.role === "Admin"
                              ? "bg-purple-100 text-purple-700 border-purple-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center w-fit ${statusStyles[user.status]}`}
                        >
                          {statusIcons[user.status]}
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C] transition-colors">
                            <FiEdit2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            <FiTrash2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C] transition-colors">
                            <FiMoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            <div className="flex justify-between items-center mt-6 px-2">
              <div className="text-sm text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-lg text-gray-400 hover:bg-[#F3EAD8] transition-colors">
                  &lt;
                </button>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`w-8 h-8 rounded-lg font-medium transition-colors ${
                      n === 1 ? "bg-[#A21C1C] text-white" : "text-gray-600 hover:bg-[#F3EAD8]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button className="px-3 py-1 rounded-lg text-gray-400 hover:bg-[#F3EAD8] transition-colors">
                  &gt;
                </button>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
