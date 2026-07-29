import React from 'react';
import logoImg from '../assets/images/nan_seasons_official_logo_1785319700109.jpg';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export const NanSeasonsLogo: React.FC<LogoProps> = ({ className = 'h-20' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={logoImg}
        alt="NAN SEASONS BOUTIQUE RESORT"
        referrerPolicy="no-referrer"
        className="h-full w-auto object-contain mix-blend-multiply rounded"
      />
    </div>
  );
};


