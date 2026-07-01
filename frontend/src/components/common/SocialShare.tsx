// @ts-nocheck
import PropTypes from 'prop-types';
import { Link2, MessageCircle } from 'lucide-react';
import { Facebook, Twitter, Linkedin } from './BrandIcons';
import { useState } from 'react';

/**
 * SocialShare Component
 * Comprehensive social sharing with Facebook, Twitter, LinkedIn, Zalo, Copy Link
 */
export default function SocialShare({ url, title, description, className = '' }) {
    const [copied, setCopied] = useState(false);

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareTitle = title || document.title;
    const shareDescription = description || '';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareLinks = [
        {
            name: 'Facebook',
            icon: Facebook,
            color: 'bg-blue-600 hover:bg-blue-700',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: 'Twitter',
            icon: Twitter,
            color: 'bg-sky-500 hover:bg-sky-600',
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                shareTitle
            )}`,
        },
        {
            name: 'LinkedIn',
            icon: Linkedin,
            color: 'bg-blue-700 hover:bg-blue-800',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        },
        {
            name: 'Zalo',
            icon: MessageCircle,
            color: 'bg-blue-500 hover:bg-blue-600',
            url: `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
        },
    ];

    return (
        <div className={className}>
            <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Chia sẻ bài viết</h4>
            <div className="flex flex-wrap gap-3">
                {shareLinks.map((platform) => {
                    const Icon = platform.icon;
                    return (
                        <a
                            key={platform.name}
                            href={platform.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${platform.color}`}
                            aria-label={`Chia sẻ lên ${platform.name}`}
                        >
                            <Icon size={16} />
                            <span className="text-sm font-medium">{platform.name}</span>
                        </a>
                    );
                })}

                <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${copied
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                    aria-label="Sao chép link"
                >
                    <Link2 size={16} />
                    <span className="text-sm font-medium">{copied ? 'Đã sao chép!' : 'Copy link'}</span>
                </button>
            </div>
        </div>
    );
}

SocialShare.propTypes = {
    url: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    className: PropTypes.string,
};
