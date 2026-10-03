const handleGenerate = async () => {
  setIsLoading(true);

  try {
    const checkResponse = await fetch(
      "/api/billing-periods/check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: selectedYear,
        }),
      }
    );

    const checkResult = await checkResponse.json();

    if (!checkResponse.ok) {
      alert(
        checkResult.message ??
          "Gagal mengecek billing period."
      );
      return;
    }

    if (checkResult.existingCount === 12) {
      alert(
        `Billing period tahun ${selectedYear} sudah lengkap.`
      );
      setIsOpen(false);
      return;
    }

    if (
      checkResult.existingCount > 0 &&
      checkResult.existingCount < 12
    ) {
      const confirmed = window.confirm(
        `Sebagian billing period tahun ${selectedYear} sudah ada.\n\n` +
        `${checkResult.existingCount} bulan sudah ada dan ` +
        `${checkResult.missingCount} bulan belum ada.\n\n` +
        `Apakah tetap generate bulan yang belum ada?`
      );

      if (!confirmed) {
        return;
      }
    }

    const generateResponse = await fetch(
      "/api/billing-periods/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: selectedYear,
        }),
      }
    );

    const generateResult = await generateResponse.json();

    if (!generateResponse.ok) {
      alert(
        generateResult.message ??
          "Gagal membuat billing period."
      );
      return;
    }

    alert(generateResult.message);

    setIsOpen(false);
    router.refresh();
  } catch (error) {
    console.error(error);
    alert(
      "Terjadi kesalahan saat membuat billing period."
    );
  } finally {
    setIsLoading(false);
  }
};