export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Login</h1>

        <p>Masuk untuk melihat status pembayaran kas Anda.</p>

        <form className="login-form">
          <label htmlFor="employeeId">ID Pegawai</label>

          <input
            id="employeeId"
            name="employeeId"
            type="text"
            placeholder="Masukkan ID Pegawai"
            autoComplete="off"
          />

          <button type="submit">
            Masuk
          </button>
        </form>
      </div>
    </main>
  );
}