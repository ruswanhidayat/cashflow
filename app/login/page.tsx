if (!response.ok) {
  setError(data.message || "Login gagal.");
  return;
}

if (data.requiresRoleSelection) {
  setError("User memiliki lebih dari satu role.");
  return;
}

if (data.role === "USER") {
  router.push("/home");
  return;
}

if (data.role === "BEND") {
  router.push("/bendahara");
  return;
}