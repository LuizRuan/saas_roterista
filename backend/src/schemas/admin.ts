import { z } from "zod";

const formatosValidos = [
  "reels-30s",
  "reels-60s",
  "shorts-60s",
  "tiktok-15s",
  "tiktok-60s",
  "youtube-3min",
] as const;

const tomsValidos = [
  "urgente",
  "inspirador",
  "provocador",
  "educativo",
  "curioso",
] as const;

export const padraoViralSchema = z.object({
  titulo: z
    .string({ required_error: "Informe um título para identificar o padrão." })
    .trim()
    .min(3, "O título precisa de pelo menos 3 caracteres.")
    .max(120, "O título pode ter no máximo 120 caracteres."),

  formato: z.enum(formatosValidos, {
    required_error: "Escolha um formato de vídeo.",
    message: "Formato inválido.",
  }),

  tom: z.enum(tomsValidos, {
    required_error: "Escolha um tom narrativo.",
    message: "Tom inválido.",
  }),

  gancho: z
    .string({ required_error: "O gancho é obrigatório." })
    .trim()
    .min(10, "O gancho precisa de pelo menos 10 caracteres.")
    .max(400, "O gancho pode ter no máximo 400 caracteres."),

  problema: z
    .string({ required_error: "O problema/desenvolvimento é obrigatório." })
    .trim()
    .min(10, "O problema precisa de pelo menos 10 caracteres.")
    .max(800, "O problema pode ter no máximo 800 caracteres."),

  virada: z
    .string({ required_error: "A virada é obrigatória." })
    .trim()
    .min(10, "A virada precisa de pelo menos 10 caracteres.")
    .max(800, "A virada pode ter no máximo 800 caracteres."),

  prova: z
    .string({ required_error: "A prova/credibilidade é obrigatória." })
    .trim()
    .min(10, "A prova precisa de pelo menos 10 caracteres.")
    .max(800, "A prova pode ter no máximo 800 caracteres."),

  cta: z
    .string({ required_error: "O Call to Action é obrigatório." })
    .trim()
    .min(5, "O CTA precisa de pelo menos 5 caracteres.")
    .max(400, "O CTA pode ter no máximo 400 caracteres."),

  ativo: z.boolean().default(true),
});

export type PadraoViralInput = z.infer<typeof padraoViralSchema>;
