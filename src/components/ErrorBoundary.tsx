import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { safeLocalStorage } from '../utils/storage';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      safeLocalStorage.removeItem('nan_seasons_current_cash');
      safeLocalStorage.removeItem('nan_seasons_current_receipt');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">เกิดข้อผิดพลาดในการแสดงผล</h1>
              <p className="text-xs text-slate-300">
                ระบบพบข้อผิดพลาดที่ไม่คาดคิด กรุณากดปุ่มโหลดหน้าใหม่ หรือล้างแคชชั่วคราว
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-32">
                <p className="text-[11px] font-mono text-red-300 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>รีโหลดหน้าใหม่ (Reload)</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
                <span>ล้างแคชข้อมูลชั่วคราวแล้วรีโหลด</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
