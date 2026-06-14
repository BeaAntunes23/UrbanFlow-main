import React from 'react';

const ErrorPage = ({ code = "404", message = "Página não encontrada", description = "Parece que o tráfego te levou por um caminho inexistente." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Animated Icon/Glitch */}
        <div className="relative mb-8">
          <h1 className="text-9xl font-black text-primary select-none animate-pulse">
            {code}
          </h1>
          <div className="absolute top-0 left-0 w-full h-full text-9xl font-black text-orange-600/30 translate-x-1 translate-y-1 select-none pointer-events-none">
            {code}
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          {message}
        </h2>
        
        <p className="text-muted-foreground mb-10 leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Voltar ao Dashboard
          </button>
          
          <button 
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-secondary text-secondary-foreground border border-border rounded-xl font-semibold hover:bg-secondary/80 transition-all active:scale-95"
          >
            Voltar atrás
          </button>
        </div>

        <div className="mt-16 flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest opacity-50">
          <div className="w-8 h-[1px] bg-border" />
          UrbanFlow AI • Traffic Systems
          <div className="w-8 h-[1px] bg-border" />
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
