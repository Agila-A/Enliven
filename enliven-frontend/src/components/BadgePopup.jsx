import React from "react";
import { X } from "lucide-react";

export default function BadgePopup({ badge, onClose, onCollect }) {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[350px] text-center relative">
        
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {/* Badge Icon */}
        <img
          src={badge.icon}
          alt="badge"
          className="w-24 h-24 mx-auto mb-3"
        />

        <h2 className="text-xl font-bold">{badge.name}</h2>
        <p className="text-gray-600 text-sm my-2">{badge.description}</p>

        {/* Collect button */}
        <button
          onClick={onCollect}
          className="mt-4 bg-emerald-600 text-white w-full py-2 rounded-lg hover:bg-emerald-700"
        >
          Collect Badge
        </button>

      </div>
    </div>
  );
}
