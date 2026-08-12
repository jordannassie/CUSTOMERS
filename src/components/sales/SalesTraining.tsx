import { BookOpen, CheckCircle, ArrowRight } from "lucide-react";

const MODULES = [
  { title: "Getting Started", desc: "Introduction to the Customers Direct Sales Program.", progress: 100, status: "complete" },
  { title: "Understanding the AI Receptionist", desc: "Learn how the product works and what problems it solves.", progress: 100, status: "complete" },
  { title: "Finding Businesses", desc: "Identify the right prospects and how to approach them.", progress: 60, status: "in-progress" },
  { title: "Running the Demo", desc: "How to show a prospect exactly what the AI Receptionist does.", progress: 0, status: "start" },
  { title: "Handling Objections", desc: "Common questions and how to address them effectively.", progress: 0, status: "start" },
  { title: "Closing the Customer", desc: "The steps to take a prospect from interested to signed.", progress: 0, status: "start" },
  { title: "Following Up", desc: "How to stay in contact without being pushy.", progress: 0, status: "start" },
];

export default function SalesTraining() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A]">Training</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Learn how to find, demo, and close Customers Direct customers.
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-100 px-6 py-5" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#0F172A]">Program Progress</span>
          <span className="text-sm font-bold text-[#2563EB]">29%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[#2563EB] transition-all"
            style={{ width: "29%" }}
            role="progressbar"
            aria-valuenow={29}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-xs text-[#94A3B8] mt-2">2 of 7 modules completed</p>
      </div>

      {/* Modules */}
      <div className="flex flex-col gap-3">
        {MODULES.map(({ title, desc, progress, status }) => (
          <div
            key={title}
            className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0">
              {status === "complete" ? (
                <CheckCircle size={19} className="text-[#22C55E]" aria-hidden="true" />
              ) : (
                <BookOpen size={19} className="text-[#2563EB]" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-[#0F172A] text-sm">{title}</p>
                {status === "in-progress" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] bg-[#EFF6FF] border border-[#DBEAFE] px-2 py-0.5 rounded-full">
                    In Progress
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B]">{desc}</p>
              {progress > 0 && progress < 100 && (
                <div className="mt-2 w-32 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#2563EB]" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            <button
              disabled
              className={`inline-flex items-center gap-1.5 font-bold text-sm px-4 py-2 rounded-full transition-colors shrink-0 ${
                status === "complete"
                  ? "bg-green-50 text-green-700 border border-green-100 cursor-default"
                  : status === "in-progress"
                  ? "bg-[#2563EB] text-white hover:bg-[#1d4ed8] cursor-not-allowed opacity-70"
                  : "border border-gray-200 text-[#64748B] hover:bg-gray-50 cursor-not-allowed opacity-70"
              }`}
              title="Training content coming soon"
              aria-label={status === "complete" ? "Completed" : status === "in-progress" ? "Continue (coming soon)" : "Start (coming soon)"}
            >
              {status === "complete" ? (
                <>
                  <CheckCircle size={13} aria-hidden="true" />
                  Done
                </>
              ) : status === "in-progress" ? (
                <>
                  Continue
                  <ArrowRight size={13} aria-hidden="true" />
                </>
              ) : (
                <>
                  Start
                  <ArrowRight size={13} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#94A3B8] text-center">
        Training content is being finalized. Modules will be unlocked as they become available.
      </p>
    </div>
  );
}
