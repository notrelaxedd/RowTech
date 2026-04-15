"use client";

import { useState } from "react";
import { Sidebar }                    from "@/components/layout/Sidebar";
import { Header }                     from "@/components/layout/Header";
import { StartSessionModal }          from "@/components/layout/StartSessionModal";
import { SimulationBanner }           from "@/components/system/SimulationBanner";
import { SessionProvider, useSession } from "@/hooks/useSession";
import { useBoats }                   from "@/hooks/useBoats";
import { useRowTech }                 from "@/hooks/useRowTech";

// =============================================================================
// Dashboard Layout — SessionProvider wraps everything so all pages share
// the same activeSession state via useSession().
// =============================================================================

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const session    = useSession();
  const { boats }  = useBoats();

  const {
    isLive, isSimulated, isLocalStream,
    sessionTime, toggleSimulation,
    hubHost, setHubHost,
  } = useRowTech(session.activeSession?.id ?? null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <SimulationBanner isSimulated={isSimulated} />
        <Header
          activeSession={session.activeSession}
          isLive={isLive}
          isSimulated={isSimulated}
          isLocalStream={isLocalStream}
          sessionTime={sessionTime}
          onStartSession={() => setModalOpen(true)}
          onToggleSimulation={toggleSimulation}
          onEndSession={() => {
            if (session.activeSession) {
              void session.endSession(session.activeSession.id);
            }
          }}
          isStarting={session.isStarting}
          isEnding={session.isEnding}
          hubHost={hubHost}
          onSetHubHost={setHubHost}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <StartSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        boats={boats}
        onConfirm={(boatId) => session.startSession(boatId)}
        isStarting={session.isStarting}
      />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
