import ScrollToTopButton from '../ui/ScrollToTopButton';
import ModernHeader from './ModernHeader';
import ModernFooter from './ModernFooter';

export default function ModernPublicLayout({ children }) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <ModernHeader />
            <main className="flex-1 w-full relative">
                {children}
            </main>
            <ModernFooter />
            <ScrollToTopButton />
        </div>
    );
}
