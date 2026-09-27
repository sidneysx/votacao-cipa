import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export function mensagemErro(error) {
  if (!error) return ''
  if (error.code === '23503') return 'Não é possível excluir: existem registros ligados a este item.'
  if (error.code === '23505') return 'Já existe um registro com esse valor.'
  return error.message || 'Erro inesperado'
}

// O Supabase devolve no máximo 1000 linhas por consulta; isto busca tudo.
export async function buscarTodos(montarConsulta) {
  const tamanho = 1000
  const linhas = []
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await montarConsulta().range(inicio, inicio + tamanho - 1)
    if (error) throw error
    linhas.push(...data)
    if (data.length < tamanho) return linhas
  }
}

export async function enviarImagem(arquivo, prefixo) {
  const extensao = arquivo.name.split('.').pop().toLowerCase()
  const caminho = `${prefixo}-${Date.now()}.${extensao}`
  const { error } = await supabase.storage.from('imagens').upload(caminho, arquivo)
  if (error) throw error
  return supabase.storage.from('imagens').getPublicUrl(caminho).data.publicUrl
}
