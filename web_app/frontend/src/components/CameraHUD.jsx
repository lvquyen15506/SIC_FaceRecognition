import React from 'react';
import MandatoryFaceKycModal from './MandatoryFaceKycModal';

export default function CameraHUD({ token, onEnrollSuccess, user }) {
  const dummyUser = user || { full_name: 'Sinh Viên', code: 'SV2026' };
  return (
    <MandatoryFaceKycModal
      user={dummyUser}
      token={token}
      onKycSuccess={() => {
        onEnrollSuccess && onEnrollSuccess();
      }}
      onLogout={() => {}}
    />
  );
}
