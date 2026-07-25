// Número de build (fallback) — o MASTER pode sobrescrever isso sem rebuild
// via Configurações do Sistema > Contato de suporte (ConfiguracaoGlobalView),
// servido por GET /api/configuracoes/exibicao. Ver montarWhatsappUrl abaixo.
const whatsappNumeroPadrao = (import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '')
const whatsappMensagemPadrao = 'Olá! Gostaria de conhecer o MotoNote.'

export function montarWhatsappUrl(numeroConfigurado) {
  const numero = (numeroConfigurado || whatsappNumeroPadrao).replace(/\D/g, '')
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(whatsappMensagemPadrao)}` : '#contato'
}
