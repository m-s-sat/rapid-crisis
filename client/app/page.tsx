"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

export default function IndexPage() {
  const router = useRouter();
  const accessToken = useSelector((state: any) => state.auth.accessToken);

  useEffect(() => {
    if (accessToken) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [accessToken, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b1326' }}>
      <div style={{ color: '#b7c4ff', fontSize: '1.5rem', fontWeight: 'bold' }}>Sentinel Command...</div>
    </div>
  );
}
