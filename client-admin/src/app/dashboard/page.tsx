"use client";

import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import Image from "next/image";

const stats = [
  { label: "Risk Prediction Today", value: 8 },
  { label: "Drone Insights Uploaded", value: 7 },
  { label: "Active Users", value: 20 },
];

const predictions = [
  { area: "Kuala Lumpur", date: "13/05/2022", status: "Low" },
  { area: "Bangsar", date: "22/05/2022", status: "Low" },
  { area: "Universiti Malaya", date: "15/06/2022", status: "Medium" },
  { area: "Petaling Jaya", date: "06/09/2022", status: "Medium" },
  { area: "Vista Angkasa", date: "25/09/2022", status: "High" },
  { area: "Damansara Perdana", date: "04/10/2022", status: "High" },
];

const statusColors: Record<string, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-red-100 text-red-700",
};

const droneImages = [
  "/images/drone1.jpg",
  "/images/drone2.jpg",
  "/images/drone3.jpg",
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row rounded-[24px] border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Dashboard" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Welcome & Stats */}
        <section className="px-10 py-6">
          <h1 className="text-3xl font-bold text-black mb-1">Welcome Back, Alex</h1>
          <div className="text-lg text-black mb-6">Organisation : University Malaya</div>
          <div className="flex gap-6 mb-8">
            <div className="bg-[#E2C275] rounded-xl flex-1 flex flex-col items-center justify-center py-6">
              <div className="text-lg font-semibold mb-2">Risk Prediction Today</div>
              <div className="text-4xl font-extrabold">8</div>
            </div>
            <div className="bg-[#E2C275] rounded-xl flex-1 flex flex-col items-center justify-center py-6">
              <div className="text-lg font-semibold mb-2">Drone Insights Uploaded</div>
              <div className="text-4xl font-extrabold">7</div>
            </div>
            <div className="bg-[#E2C275] rounded-xl flex-1 flex flex-col items-center justify-center py-6">
              <div className="text-lg font-semibold mb-2">Active Users</div>
              <div className="text-4xl font-extrabold">20</div>
            </div>
          </div>

          {/* Quick Action */}
          <div className="mb-8">
            <div className="font-bold text-xl mb-3">Quick Action</div>
            <div className="flex gap-4">
              <button className="bg-[#A21C1C] text-white px-6 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">New Risk Prediction</button>
              <button className="bg-[#E5E7EB] text-black px-6 py-3 rounded-lg font-bold text-base hover:bg-[#F3EAD8]">Upload New Drone Images</button>
            </div>
          </div>

          {/* Recent Predictions Table */}
          <div className="mb-10">
            <div className="font-bold text-xl mb-3">Recent Predictions</div>
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full bg-white rounded-xl">
                <thead>
                  <tr className="text-left text-black font-semibold text-base bg-[#F3EAD8]">
                    <th className="py-3 px-6">Area</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((row, idx) => (
                    <tr key={row.area + row.date} className={idx % 2 === 0 ? "bg-[#F9F6F2]" : "bg-white"}>
                      <td className="py-3 px-6 font-medium text-black">{row.area}</td>
                      <td className="py-3 px-6 text-black">{row.date}</td>
                      <td className="py-3 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[row.status]}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Drone Images */}
          <div>
            <div className="font-bold text-xl mb-3">Recent Drone Images</div>
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 