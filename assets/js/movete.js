(function () {
  const groups = document.querySelectorAll("[data-filter-group]");

  groups.forEach((group) => {
    const targetSelector = group.dataset.filterTarget;
    if (!targetSelector) return;

    const items = Array.from(document.querySelectorAll(targetSelector));
    const buttons = Array.from(group.querySelectorAll("[data-filter]"));

    if (!items.length || !buttons.length) return;

    const applyFilter = (filter) => {
      buttons.forEach((button) => {
        const active = button.dataset.filter === filter;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });

      items.forEach((item) => {
        const value = item.dataset.category || item.dataset.kind || "";
        const visible = filter === "all" || value === filter;
        item.hidden = !visible;
      });

      document.querySelectorAll("[data-filter-section]").forEach((section) => {
        const visibleItems = section.querySelectorAll(`${targetSelector}:not([hidden])`);
        section.hidden = visibleItems.length === 0;
      });
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyFilter(button.dataset.filter || "all"));
    });

    applyFilter("all");
  });

  document.querySelectorAll(".section-jump-nav").forEach((nav) => {
    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const setActive = (hash) => {
      links.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === hash);
      });
    };

    links.forEach((link) => {
      link.addEventListener("click", () => setActive(link.getAttribute("href")));
    });

    setActive(window.location.hash || "#cine-tradicional");
    window.addEventListener("hashchange", () => setActive(window.location.hash));
  });

  document.querySelectorAll("[data-share-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const message = `Mirá esta cartelera en MoVeTe:\n${document.title}\n${window.location.href}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    });
  });
})();
