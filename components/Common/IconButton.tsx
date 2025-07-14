import React from 'react';

interface Props {
  icon: any;
  onClick: () => void;
}

export default function IconButton({ icon, onClick }: Props) {
  return (
    <button style={{ background: 'none', border: 'none', padding: 8 }} onClick={onClick}>
      <img src={icon} alt="icon" style={{ width: 32, height: 32 }} />
    </button>
  );
} 