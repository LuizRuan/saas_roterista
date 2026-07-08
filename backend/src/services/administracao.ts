import { UsuarioModel } from "../models/usuario";

/**
 * Promove uma conta existente a admin.
 *
 * Também revoga a sessão ativa (refreshTokenHash) — sem isso, uma sessão já
 * aberta continuaria válida com o papel antigo até o access token expirar
 * (até 15 min), e qualquer mudança futura de papel (inclusive rebaixamento)
 * deve seguir o mesmo cuidado.
 *
 * Retorna true se encontrou e atualizou a conta, false se o e-mail não existe.
 */
export async function promoverAdmin(email: string): Promise<boolean> {
  const resultado = await UsuarioModel.updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { papel: "admin", refreshTokenHash: null } }
  );
  return resultado.matchedCount > 0;
}

/**
 * Muda o plano de uma conta existente para "pro".
 *
 * Não precisa revogar a sessão ativa — o plano não afeta o papel usado na
 * autenticação, só limites de uso, que já são checados a cada requisição.
 *
 * Retorna true se encontrou e atualizou a conta, false se o e-mail não existe.
 */
export async function promoverPro(email: string): Promise<boolean> {
  const resultado = await UsuarioModel.updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { plano: "pro" } }
  );
  return resultado.matchedCount > 0;
}
