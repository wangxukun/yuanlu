export type User = {
  userid: string;
  phone: string;
};

export type onlineUser = {
  userid: string;
  phone: string;
  lastActiveAt: Date;
};

export type PodcastField = {
  categoryid: number;
  title: string;
};
