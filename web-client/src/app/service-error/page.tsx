'use client';

import React from 'react';
import GlobalError from '../error';

export default function Fallback500Page() {
  return (
    <GlobalError
      error={new Error('Mô phỏng kịch bản dịch vụ phía sau gián đoạn (Zero-500 Graceful Degradation Active).')}
      reset={() => window.location.reload()}
    />
  );
}

