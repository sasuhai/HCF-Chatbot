import { ChatWidget } from "@/components/chat-widget"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Settings,
  MessageCircle,
  Sparkles,
  BookOpen,
  Database,
  Zap,
  Share2,
  ArrowRight,
  FileText,
  Dna,
  Cpu,
  Globe,
  Facebook
} from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      {/* Admin Quick Access */}
      <div className="absolute top-6 right-6 z-20">
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2 border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <Settings className="w-4 h-4" />
            <span>Konsol Admin</span>
          </Button>
        </Link>
      </div>

      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-yellow-100/50 to-transparent dark:from-yellow-900/10 -z-10" />
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-yellow-200/30 dark:bg-yellow-900/10 blur-[100px] -z-10" />

      {/* Section 1: Hero & Purpose */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 p-1 pr-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium text-xs mb-4 uppercase tracking-wider">
            <span className="bg-yellow-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">AI LAB</span>
            Persekitaran Latihan & Sandbox HCF
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.9] flex flex-col">
            <span className="text-yellow-500 drop-shadow-sm">HCF</span>
            <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">
              AI ChatBOT
            </span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-slate-700 dark:text-slate-200 max-w-2xl mx-auto leading-relaxed pt-4">
            Sahabat digital anda untuk memahami <span className="text-yellow-600 dark:text-yellow-500 font-bold border-b-2 border-yellow-500/30">Islam</span> dengan mudah dan mesra
          </p>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mt-4">
            Platform ini dikhaskan untuk menguji dan melatih AI Chatbot Hidayah Centre Foundation (HCF).
            Matlamat kami adalah untuk memberikan jawapan yang tepat, penuh ihsan, dan mengikut piawaian
            kepada soalan mualaf selaras dengan amalan dan garis panduan rasmi HCF.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/admin">
              <Button size="lg" className="h-12 px-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-semibold shadow-lg shadow-yellow-500/25 gap-2">
                Akses Panel Admin <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 font-medium italic">Klik widget sembang untuk menguji latihan semasa →</p>
          </div>
        </div>
      </section>

      {/* Section 2: Training Guidelines */}
      <section className="py-16 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl w-fit text-yellow-600">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Cara Melatih AI</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Kepintaran AI adalah berkadar terus dengan kualiti dokumen pangkalan pengetahuan yang anda sediakan.
                Ikuti langkah-langkah ini untuk meningkatkan ketepatan Pembantu HCF:
              </p>

              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm italic">Navigasi ke Admin &gt; Knowledge Base</p>
                    <p className="text-sm text-slate-500">Muat naik dokumen sumber anda terus ke sistem untuk memulakan proses ingestion.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Pilih Dokumen yang Sesuai</p>
                    <p className="text-sm text-slate-500 italic">Kami menyokong fail PDF, DOCX, dan TXT. Utamakan risalah rasmi HCF, senarai FAQ, dan manual prosedur.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Strukturkan untuk Keberkesanan</p>
                    <p className="text-sm text-slate-500 italic">Pastikan dokumen menggunakan tajuk yang jelas. Gunakan pasangan Soalan/Jawapan jika boleh. Ringkaskan teks panjang kepada garis panduan yang jelas untuk AI.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <FileText className="w-6 h-6 text-yellow-500 mb-4" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 italic">PDF / Docs</h4>
                <p className="text-xs text-slate-500">Terbaik untuk manual rasmi dan bimbingan mendalam.</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Zap className="w-6 h-6 text-blue-500 mb-4" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 italic">FAQ</h4>
                <p className="text-xs text-slate-500">Keutamaan tertinggi. Mengajar AI corak respons terus.</p>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Globe className="w-6 h-6 text-emerald-500 mb-4" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 italic">Sitemaps</h4>
                <p className="text-xs text-slate-500">Ingest seluruh halaman laman web secara automatik melalui sitemap.xml.</p>
              </div>
              <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-yellow-500/20 shadow-xl shadow-yellow-500/10">
                <Sparkles className="w-6 h-6 text-purple-500 mb-4" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 italic">Dynamic Prompt</h4>
                <p className="text-xs text-slate-500 italic">Laraskan 'System Instructions' di tetapan untuk mengubah nada suara bot.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Technical Details for Support */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white italic">Infrastruktur Teknikal</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Seni bina yang dibina untuk skalabiliti, keselamatan, dan pencapaian yang pintar.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-transparent hover:border-yellow-500/30 transition-all group">
              <Cpu className="w-10 h-10 text-slate-400 group-hover:text-yellow-500 mb-6 transition-colors" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 italic">AI Core</h3>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                Dikuasakan oleh **OpenAI GPT-4o-mini**, dioptimumkan untuk respons pantas dan ketepatan tinggi dalam konteks agama.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-transparent hover:border-yellow-500/30 transition-all group">
              <Dna className="w-10 h-10 text-slate-400 group-hover:text-yellow-500 mb-6 transition-colors" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 italic">Algoritma RAG</h3>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                Menggunakan **Retrieval-Augmented Generation**. Dokumen dipecahkan kepada segmen dan disimpan sebagai vektor dimensi tinggi.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-transparent hover:border-yellow-500/30 transition-all group">
              <Database className="w-10 h-10 text-slate-400 group-hover:text-yellow-500 mb-6 transition-colors" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 italic">Vector Storage</h3>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                **Pinecone Vector Database** menguruskan embeddings, manakala **MySQL (via Prisma)** mengendalikan log sembang dan tetapan.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-transparent hover:border-yellow-500/30 transition-all group">
              <Share2 className="w-10 h-10 text-slate-400 group-hover:text-yellow-500 mb-6 transition-colors" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 italic">NextJS 14</h3>
              <p className="text-sm text-slate-500 leading-relaxed italic">
                Dibina dengan pendekatan Serverless untuk prestasi tinggi dan paparan responsif mudah alih yang lancar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Roadmap */}
      <section className="py-20 px-6 bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-[40px] mx-6 mb-20 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-yellow-500/5 -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold italic tracking-tight italic">Roadmap & Integrasi</h2>
          <p className="text-slate-400 text-lg">
            Setelah fasa latihan selesai, Pembantu HCF akan dilancarkan di pelbagai platform:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 pt-6">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <Globe className="w-8 h-8 text-yellow-400" />
              </div>
              <span className="font-semibold italic">Laman Web Rasmi</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <Facebook className="w-8 h-8 text-blue-400" />
              </div>
              <span className="font-semibold italic">FB Messenger</span>
            </div>
            <div className="flex flex-col items-center gap-3 opacity-50">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <MessageCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <span className="font-semibold italic">WhatsApp (Dirancang)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img
              src="https://hidayahcentre.org.my/wp-content/uploads/2021/06/logo-web2.png"
              className="h-10 w-auto"
              alt="Logo HCF"
            />
            <span className="text-sm text-slate-500 italic">Idiahus © 2026 Hidayah Centre Foundation. AI Lab.</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <Link href="/admin" className="hover:text-yellow-600 transition-colors italic">Dashboard Admin</Link>
            <a href="#" className="hover:text-yellow-600 transition-colors italic">Dasar Privasi</a>
            <a href="#" className="hover:text-yellow-600 transition-colors italic">Halaman Sokongan</a>
          </div>
        </div>
      </footer>

      {/* The Chat Widget */}
      <ChatWidget />
    </main>
  )
}
