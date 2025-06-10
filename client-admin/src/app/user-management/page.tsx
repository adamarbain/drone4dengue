"use client";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { FiSearch, FiPlus, FiFilter, FiArrowDown, FiMoreHorizontal } from "react-icons/fi";
import Image from "next/image";

const sidebarLinks = [
  { label: "Dashboard" },
  { label: "User Management", active: true },
  { label: "Drone Management" },
  { label: "Data Management" },
  { label: "Prediction & Alert" },
  { label: "Reports" },
  { label: "Settings" },
];

const users = [
  { id: "U-001", name: "Natali Craig", address: "Meadow Lane Oakland", role: "Normal User", status: "In Progress", avatar: "/images/user1.jpg" },
  { id: "U-002", name: "Kate Morrison", address: "Larry San Francisco", role: "Normal User", status: "Verified", avatar: "/images/user2.jpg" },
  { id: "U-003", name: "Drew Cano", address: "Bagwell Avenue Ocala", role: "Normal User", status: "Pending", avatar: "/images/user3.jpg" },
  { id: "U-004", name: "Orlando Diggs", address: "Washburn Baton Rouge", role: "Normal User", status: "Verified", avatar: "/images/user4.jpg", checked: true },
  { id: "U-005", name: "Andi Lane", address: "Nest Lane Olivette", role: "Normal User", status: "Unregistered", avatar: "/images/user5.jpg", disabled: true },
  { id: "U-006", name: "Natali Craig", address: "Meadow Lane Oakland", role: "Normal User", status: "In Progress", avatar: "/images/user1.jpg" },
  { id: "U-007", name: "Kate Morrison", address: "Larry San Francisco", role: "Admin", status: "Verified", avatar: "/images/user2.jpg" },
  { id: "U-008", name: "Drew Cano", address: "Bagwell Avenue Ocala", role: "Admin", status: "Pending", avatar: "/images/user3.jpg" },
  { id: "U-009", name: "Orlando Diggs", address: "Washburn Baton Rouge", role: "Admin", status: "Verified", avatar: "/images/user4.jpg" },
  { id: "U-010", name: "Andi Lane", address: "Nest Lane Olivette", role: "Admin", status: "Unregistered", avatar: "/images/user5.jpg", disabled: true },
];

const statusStyles: Record<string, string> = {
  "In Progress": "text-blue-600 bg-blue-100",
  "Verified": "text-green-600 bg-green-100",
  "Pending": "text-yellow-800 bg-yellow-100",
  "Unregistered": "text-gray-500 bg-gray-200",
};

export default function UserManagementPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="User Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <section className="px-10 py-6">
          <h1 className="text-3xl font-bold text-black mb-1">User Management</h1>
          <div className="text-xl text-gray-400 mb-6">Manage all users that registered within the same organization.</div>
          {/* Quick Action */}
          <div className="mb-8 flex gap-4">
            <button className="bg-[#E2C275] text-black px-8 py-3 rounded-lg font-bold text-base hover:bg-[#C9A74B]">Add New User</button>
            <button className="bg-[#E5E7EB] text-black px-8 py-3 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">Manage User Permission and Roles</button>
          </div>
          {/* User List Table */}
          <div className="mb-10">
            <div className="font-bold text-xl mb-3">User List</div>
            <div className="bg-[#A21C1C] rounded-t-xl px-4 py-3 flex items-center gap-3">
              <button className="bg-white text-[#A21C1C] rounded-lg p-2"><FiPlus /></button>
              <button className="bg-white text-[#A21C1C] rounded-lg p-2"><FiFilter /></button>
              <button className="bg-white text-[#A21C1C] rounded-lg p-2"><FiArrowDown /></button>
              <div className="flex-1" />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="rounded-lg bg-[#A21C1C] text-white placeholder-white px-4 py-2 w-48 border border-white focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                />
                <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-lg" />
              </div>
            </div>
            <div className="overflow-x-auto rounded-b-xl bg-white">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-black font-semibold text-base border-b border-gray-200">
                    <th className="py-3 px-6 font-semibold"><input type="checkbox" className="accent-[#A21C1C]" disabled /></th>
                    <th className="py-3 px-6 font-semibold">User ID</th>
                    <th className="py-3 px-6 font-semibold">User</th>
                    <th className="py-3 px-6 font-semibold">Address</th>
                    <th className="py-3 px-6 font-semibold">Role and Permission</th>
                    <th className="py-3 px-6 font-semibold">Status</th>
                    <th className="py-3 px-6 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} className={user.disabled ? "bg-gray-100 text-gray-400" : idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}>
                      <td className="py-3 px-6">
                        <input type="checkbox" className="accent-[#A21C1C]" checked={user.checked} disabled={user.disabled} readOnly />
                      </td>
                      <td className="py-3 px-6 font-medium">{user.id}</td>
                      <td className="py-3 px-6 flex items-center gap-3">
                        <Image src={user.avatar} alt={user.name} width={32} height={32} className="rounded-full object-cover" />
                        {user.name}
                      </td>
                      <td className="py-3 px-6">{user.address}</td>
                      <td className="py-3 px-6">{user.role}</td>
                      <td className="py-3 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyles[user.status]}`}>{user.status === "Verified" ? <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span> : user.status === "In Progress" ? <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span> : user.status === "Pending" ? <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> : user.status === "Unregistered" ? <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span> : null}{user.status}</span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <FiMoreHorizontal className="text-xl text-gray-400 cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex justify-end items-center gap-2 mt-4">
              <button className="text-xl text-gray-400 px-2">&lt;</button>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`w-8 h-8 rounded-full font-bold ${n === 1 ? "bg-[#A21C1C] text-white" : "text-black hover:bg-[#F3EAD8]"}`}>{n}</button>
              ))}
              <button className="text-xl text-gray-400 px-2">&gt;</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 