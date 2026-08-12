import { headers } from "next/headers";
import { getThemeForDomain } from "@/lib/actions/website";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const hostname = headersList.get("x-custom-domain") || "";

  let styleTag = "";

  if (hostname) {
    const result = await getThemeForDomain(hostname);
    if (result?.theme) {
      const t = result.theme;
      styleTag = `
        :root {
          --theme-primary: ${t.primaryColor};
          --theme-secondary: ${t.secondaryColor};
          --theme-font: ${t.fontFamily};
          --theme-heading-font: ${t.headingFont || t.fontFamily};
          --theme-radius: ${t.borderRadius};
        }
        body { font-family: var(--theme-font, sans-serif); }
        h1,h2,h3,h4,h5,h6 { font-family: var(--theme-heading-font, sans-serif); }
      `;
    }
  }

  return (
    <>
      {styleTag && <style dangerouslySetInnerHTML={{ __html: styleTag }} />}
      {children}
    </>
  );
}
