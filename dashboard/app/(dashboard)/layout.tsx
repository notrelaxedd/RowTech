"use client";

import { useState } from "react";
import { Sidebar }            from "@/components/layout/Sidebar";
import { Header }             from "@/components/layout/Header";
import { StartSessionModal }  from "@/components/layout/StartSessionModal";
import { SimulationBanner }   from "@/components/system/SimulationBanner";
import { useSession }         from "@/hooks/useSession";
import { useBoats }           from "@/hooks/useBoats";
import { useRowTech }         from "@/hooks/useRowTech";

// =============================================================================
// Dashboard Layout — Sidebar + Header with session management.
// Wraps all authenticated dashboard pages.
// =============================================================================

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const sessionHook  = useSession();
  const { boats }    = useBoats();

  // useRowTech drives the header status; pages subscribe independently
  const { isLive, isSimulated, sessionTime } = useRowTech(
    sessionHook.activeSession?.id ?? null,
  );

  const handleStartConfirm = async (boatId: string) => {
    await sessionHook.startSession(boatId);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <SimulationBanner isSimulated={isSimulated} />
        <Header
          activeSession={sessionHook.activeSession}
          isLive={isLive}
          isSimulated={isSimulated}
          sessionTime={sessionTime}
          onStartSession={() => setModalOpen(true)}
          onEndSession={() => {
            if (sessionHook.activeSession) {
              void sessionHook.endSession(sessionHook.activeSession.id);
            }
          }}
          isStarting={sessionHook.isStarting}
          isEnding={sessionHook.isEnding}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        boats={boats}
        onConfirm={handleStartConfirm}
        isStarting={sessionHook.isStarting}
      />
    </div>
  );
}
