import QRCode from "qrcode";

/**
 * Gera QR code como Data URL (base64) para exibir inline no frontend.
 *
 * Sem dependência de serviço externo — tudo gerado no servidor.
 * As cores seguem o design system do Gancho (tinta/papel).
 */
export async function gerarQRCodeBase64(texto: string): Promise<string> {
  return QRCode.toDataURL(texto, {
    width: 280,
    margin: 2,
    color: {
      dark: "#131210",  // --color-tinta
      light: "#f4f2ec", // --color-papel
    },
    errorCorrectionLevel: "M",
  });
}
