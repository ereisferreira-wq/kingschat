import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Bot, Crown, MessageSquare, Smartphone, Zap, Shield, BarChart3, Users, ArrowRight } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <header className="border-b border-amber-900/20 bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <MessageSquare className="w-5 h-5 text-amber-400 -ml-1" />
            <span className="text-xl font-bold text-amber-400">Kings Chat</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="text-amber-200 hover:text-amber-400 hover:bg-amber-500/10">Entrar</Button></Link>
            <Link to="/signup"><Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Comece agora</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-full px-6">
            <Bot className="w-8 h-8 text-primary" />
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Atendimento Inteligente via <span className="text-primary">WhatsApp</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Automatize o atendimento da sua empresa com IA. Responda clientes, gerencie leads e
          agende disparos de mensagens — tudo pelo WhatsApp.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/signup")}>
            Comece agora <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
            Já tenho conta
          </Button>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Tudo que você precisa</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Bot, title: "Chatbot com IA", desc: "Treine a IA com seus PDFs e site. Ela responde automaticamente suas perguntas dos clientes." },
            { icon: Users, title: "CRM Completo", desc: "Gerencie leads, clientes e oportunidades. Pipeline de vendas com status personalizados." },
            { icon: Smartphone, title: "WhatsApp Integrado", desc: "Conecte seu WhatsApp e atenda clientes diretamente pelo painel. Disparo programado." },
            { icon: Zap, title: "Disparo em Massa", desc: "Envie campanhas com tempo aleatório anti-ban. Mensagens personalizadas com {nome}." },
            { icon: BarChart3, title: "Dashboard", desc: "Acompanhe métricas de atendimento, vendas e performance do chatbot em tempo real." },
            { icon: Shield, title: "Seguro e Confiável", desc: "Disparo inteligente com intervalos aleatórios para proteger sua conta WhatsApp." },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary/5 py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para transformar seu atendimento?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Crie sua conta gratuita e comece a usar em 5 minutos. Sem cartão de crédito.
          </p>
          <Button size="lg" onClick={() => navigate("/signup")}>
            Comece agora <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Kings Chat — Atendimento Inteligente via WhatsApp</p>
      </footer>
    </div>
  );
}
