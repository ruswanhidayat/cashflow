import Sidebar from "./sidebar";
import UserMenu from "./user-menu";

type Role = {
  id: number;
  code: string;
  name: string;
};

type AppShellProps = {
  children: React.ReactNode;
  userName: string;
  currentRole: string;
  roles: Role[];
};

export default function AppShell({
  children,
  userName,
  currentRole,
  roles,
}: AppShellProps) {
  return (
    <div className="app-page">
      <header className="app-header">
        <div className="app-brand">
          Buku Kas
        </div>

        <div className="app-header-right">
          <span
            className={`app-role ${
              currentRole === "BEND"
                ? "role-bend"
                : "role-user"
            }`}
          >
            {currentRole === "BEND"
              ? "Bendahara"
              : "User"}
          </span>

          <UserMenu
            userName={userName}
            currentRole={currentRole}
            roles={roles}
          />
        </div>
      </header>

      <Sidebar currentRole={currentRole} />

      <main className="app-content">
        {children}
      </main>
    </div>
  );
}