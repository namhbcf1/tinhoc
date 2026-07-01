// @ts-nocheck
import ScrollToTopButton from '../ui/ScrollToTopButton';
import ModernHeader from './ModernHeader';
import ModernFooter from './ModernFooter';

export default function ModernPublicLayout({ children }) {
    return (
        <div className="vt-public-shell flex flex-col min-h-screen text-foreground">
            <ModernHeader />
            <main className="flex-1 w-full relative overflow-x-hidden">
                {children}
            </main>
            <ModernFooter />
            <ScrollToTopButton />
        </div>
    );
}
