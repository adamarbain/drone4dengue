"use client";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { FiSearch, FiEdit2, FiTrash2 } from "react-icons/fi";
import Image from "next/image";

const sidebarLinks = [
  { label: "Dashboard" },
  { label: "User Management" },
  { label: "Drone Management", active: true },
  { label: "Data Management" },
  { label: "Prediction & Alert" },
  { label: "Reports" },
  { label: "Settings" },
];

const drones = [
  { id: "DRN-001", date: "13/05/2022", area: "FSKTM UM", status: "Operational" },
  { id: "DRN-002", date: "22/05/2022", area: "Dewan Tuanku Canselor", status: "Operational" },
  { id: "DRN-003", date: "15/06/2022", area: "Menara Axis, Petaling Jaya", status: "Maintenance" },
  { id: "DRN-004", date: "06/09/2022", area: "One Utama, Damansara Perdana", status: "Maintenance" },
  { id: "DRN-005", date: "25/09/2022", area: "Vista Angkasa", status: "Inactive" },
  { id: "DRN-006", date: "04/10/2022", area: "Pantai Hillpark", status: "Operational" },
  { id: "DRN-007", date: "17/10/2022", area: "Jalan Telawi, Bangsar", status: "Operational" },
];

const statusStyles: Record<string, string> = {
  "Operational": "text-green-700 bg-green-100",
  "Maintenance": "text-yellow-800 bg-yellow-100",
  "Inactive": "text-red-700 bg-red-100",
};

const droneImages = [
  "/images/drone1.jpg",
  "/images/drone2.jpg",
  "/images/drone3.jpg",
];

export default function DroneManagementPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Drone Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <section className="px-10 py-6">
          <h1 className="text-3xl font-bold text-black mb-1">Drone Management</h1>
          <div className="text-xl text-gray-400 mb-6">Manage all aspect of the drones and images captured by drone</div>
          {/* Drone List Table */}
          <div className="mb-10">
            <div className="font-bold text-xl mb-3">Drone List</div>
            <div className="bg-[#A21C1C] rounded-t-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search drones by ID or name"
                  className="rounded-lg bg-[#A21C1C] text-white placeholder-white px-4 py-2 w-full border border-white focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
                />
              </div>
              <FiSearch className="text-white text-lg ml-2" />
            </div>
            <div className="overflow-x-auto rounded-b-xl bg-white">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-black font-semibold text-base border-b border-gray-200">
                    <th className="py-3 px-6 font-semibold">Drone ID</th>
                    <th className="py-3 px-6 font-semibold">Registration Date</th>
                    <th className="py-3 px-6 font-semibold">Operational Area</th>
                    <th className="py-3 px-6 font-semibold">Status</th>
                    <th className="py-3 px-6 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drones.map((drone, idx) => (
                    <tr key={drone.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}>
                      <td className="py-3 px-6 font-medium">{drone.id}</td>
                      <td className="py-3 px-6">{drone.date}</td>
                      <td className="py-3 px-6">{drone.area}</td>
                      <td className="py-3 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyles[drone.status]}`}>{drone.status}</span>
                      </td>
                      <td className="py-3 px-6 flex gap-2">
                        <button className="p-2 rounded-lg bg-[#FFF7E3] hover:bg-yellow-100 text-[#A21C1C] border border-yellow-200"><FiEdit2 /></button>
                        <button className="p-2 rounded-lg bg-[#FFF7E3] hover:bg-red-100 text-[#A21C1C] border border-red-200"><FiTrash2 /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Drone Images */}
          <div>
            <div className="font-bold text-xl mb-3">Drone Images</div>
            <div className="flex gap-4 mb-4">
              <button className="bg-[#E2C275] text-black px-6 py-2 rounded-lg font-bold text-base">DRN-001 - Vista Angkasa</button>
            </div>
            <div className="flex gap-6">
              {droneImages.map((src, idx) => (
                <div key={idx} className="w-64 h-48 rounded-xl overflow-hidden bg-gray-200">
                  <Image
                    src={src}
                    alt={`Drone ${idx + 1}`}
                    width={256}
                    height={192}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
              <button className="w-12 h-48 flex items-center justify-center rounded-xl bg-[#FFF7E3] border border-gray-300 text-[#A21C1C] text-2xl hover:bg-yellow-100">
                <span className="rotate-180">&#10140;</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 