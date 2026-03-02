import { ConnectButton } from "web3uikit";

export default function Header() {
    return (
        <header className="border-b border-white/10 bg-black">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-white tracking-tight">
                        LOTTERY
                    </div>
                </div>
                
                <nav className="hidden md:flex items-center gap-8 text-sm">
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Home</a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">About</a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Docs</a>
                </nav>
                
                <div>
                    <ConnectButton moralisAuth={false} />
                </div>
            </div>
        </header>
    );
}