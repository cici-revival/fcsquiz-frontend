import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { useAuth } from "@/shared/hooks/useAuth";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/shared/ui";
import styles from './Login.module.css'

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const magicLinkToken = searchParams.get("token");

  useEffect(() => {
    if (!magicLinkToken) return;

    const confirm = async () => {
      try {
        setIsConfirming(true);
        const data = await adminkaApi.confirmMagicLink({ token: magicLinkToken });
        login({
          access_token: data.access_token,
        });
        toast.success("Вы успешно вошли");
        navigate("/admin/home", { replace: true });
      } catch (error) {
        console.error("Magic link confirm error:", error);
        toast.error("Не удалось подтвердить ссылку. Попробуйте ещё раз.");
      } finally {
        setIsConfirming(false);
      }
    };

    confirm();
  }, [login, magicLinkToken, navigate]);

  useEffect(() => {
    if (isAuthenticated && !magicLinkToken) {
      navigate("/admin/home", { replace: true });
    }
  }, [isAuthenticated, magicLinkToken, navigate]);

  const handleRequestMagicLink = async () => {
    if (!email) {
      toast.error("Введите email");
      return;
    }

    try {
      setIsSubmitting(true);
      await adminkaApi.authByEmail({ email });
      toast.success(`Ссылка успешно отправлена на почту ${email}`);
    } catch (error) {
      console.error("Auth by email error:", error);
      toast.error("Не удалось отправить magic link. Попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

 return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Вход в админку</CardTitle>
        </CardHeader>
        <CardContent>
          {isConfirming ? (
            <p className={styles.confirming}>Подтверждаем ссылку...</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRequestMagicLink();
              }}
              className={styles.form}
            >
              <div className={styles.field}>
                {/* <Label htmlFor="email" className={styles.label}>
                  Email
                </Label> */}
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={styles.input}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className={styles.button}
              >
                {isSubmitting ? "Отправляем..." : "Получить magic link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
